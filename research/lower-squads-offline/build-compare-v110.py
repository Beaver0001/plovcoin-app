#!/usr/bin/env python3
"""Local-only candidate build/comparison. No wallet, RPC, deployment or registry submission."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE = '5398b5c7c534de014091132da37c6478cce671a8'
REPOSITORY = 'https://github.com/MeteoraAg/damm-v2.git'
IMAGE = 'solanafoundation/solana-verifiable-build@sha256:f71be5ca7620b7e40933b7f1294fa44e01d08c1fc5ba1f375a2478f5a01580d3'
CLI_SHA256 = 'b9d5ccce9634dc14269cab3e7a58649bc141b3306e7735a94478c936341f211f'
PIN = ROOT / 'live-program-pin-v109.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def artifact(path):
    path = pathlib.Path(path).resolve(strict=True)
    if not path.is_file() or not 64 <= path.stat().st_size <= 64 * 1024 * 1024:
        raise ValueError('ELF file size/type rejected')
    data = path.read_bytes()
    if data[:4] != b'\x7fELF':
        raise ValueError('ELF magic required')
    trimmed = data.rstrip(b'\0')
    return {'path': str(path), 'bytes': len(data), 'fullSHA256': digest(data),
            'zeroTrimmedBytes': len(trimmed), 'zeroTrimmedSHA256': digest(trimmed)}


def compare(first, second):
    if pathlib.Path(first).samefile(second):
        raise ValueError('Two distinct artifact files required')
    a, b = artifact(first), artifact(second)
    pin = json.loads(PIN.read_text())
    matching = all(x['zeroTrimmedSHA256'] == pin['zeroTrimmedElfSHA256'] for x in (a, b))
    identical = a['fullSHA256'] == b['fullSHA256']
    return {'version': 110, 'status': 'ARTIFACTS_MATCH_RETAINED_PIN_ONLY' if matching and identical else 'ARTIFACT_COMPARISON_INCOMPLETE_OR_MISMATCH',
            'artifacts': [a, b], 'twoArtifactFilesByteIdentical': identical,
            'bothMatchRetainedV109NormalizedHash': matching,
            'retainedDeploymentSlot': pin['deploymentSlot'],
            'sourceBuildProvenanceVerifiedByComparison': False,
            'currentChainRechecked': False, 'productionAccepted': False, 'MAINNET_GO': 'NO'}


def run(args, cwd=None, log=None, timeout=120):
    if log:
        with pathlib.Path(log).open('x') as stream:
            subprocess.run(args, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, check=True, timeout=timeout)
        return ''
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=True, timeout=timeout).stdout.strip()


def capabilities(cli):
    report = {'version': 110, 'buildPerformed': False, 'productionAccepted': False, 'MAINNET_GO': 'NO'}
    cli = pathlib.Path(cli).resolve(strict=True)
    if digest(cli.read_bytes()) != CLI_SHA256:
        raise ValueError('Pinned CLI checksum mismatch')
    report['cliVersion'] = run([str(cli), '--version'])
    if report['cliVersion'] != 'solana-verify 0.5.2':
        raise ValueError('Unexpected CLI version')
    report['cliSHA256'] = CLI_SHA256
    report['dockerExecutable'] = shutil.which('docker')
    report['gitExecutable'] = shutil.which('git')
    report['dockerServerPlatform'] = None
    if report['dockerExecutable']:
        try:
            report['dockerServerPlatform'] = run(['docker', 'version', '--format', '{{.Server.Os}}/{{.Server.Arch}}'], timeout=30)
        except (subprocess.SubprocessError, OSError):
            report['dockerServerPlatform'] = 'UNAVAILABLE'
    report['readyForCandidateBuild'] = bool(report['gitExecutable']) and report['dockerServerPlatform'] == 'linux/amd64'
    return report


def build(cli, output):
    state = capabilities(cli)
    if not state['readyForCandidateBuild']:
        raise ValueError('Candidate build requires a reachable linux/amd64 Docker daemon and Git')
    output = pathlib.Path(output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    evidence = json.loads((ROOT / 'source-evidence-v109.json').read_text())
    state.update({'status': 'BUILD_IN_PROGRESS', 'sourceCommit': SOURCE, 'image': IMAGE,
                  'recipeStatus': 'INDEPENDENT_CANDIDATE_NOT_CONFIRMED_DEPLOYER_RECIPE', 'runs': []})
    try:
        for number in (1, 2):
            checkout = output / ('source-' + str(number))
            run(['git', 'clone', '--no-checkout', REPOSITORY, str(checkout)], log=output / ('clone-' + str(number) + '.log'), timeout=600)
            run(['git', 'checkout', '--detach', SOURCE], cwd=checkout)
            if run(['git', 'rev-parse', 'HEAD'], cwd=checkout) != SOURCE:
                raise ValueError('Source commit mismatch')
            for item in evidence['sources']:
                blob = run(['git', 'hash-object', item['path']], cwd=checkout)
                if blob != item['gitBlobSha'] or digest((checkout / item['path']).read_bytes()) != item['sha256']:
                    raise ValueError('Source evidence mismatch: ' + item['path'])
            if run(['git', 'status', '--porcelain'], cwd=checkout):
                raise ValueError('Checkout must be clean before build')
            # Only the build subcommand. Do not replace with verify-from-repo or remote submit-job.
            command = [str(pathlib.Path(cli).resolve()), 'build', str(checkout), '--library-name', 'cp_amm', '--base-image', IMAGE, '--arch', 'v0']
            run(command, log=output / ('build-' + str(number) + '.log'), timeout=3600)
            if run(['git', 'status', '--porcelain'], cwd=checkout):
                raise ValueError('Source or lockfile changed during build')
            binary = checkout / 'target/deploy/cp_amm.so'
            state['runs'].append({'sourceCommit': SOURCE, 'command': command, 'artifact': artifact(binary)})
        state.update(compare(output / 'source-1/target/deploy/cp_amm.so', output / 'source-2/target/deploy/cp_amm.so'))
        state['buildPerformed'] = True
        state['sourceCheckoutsVerifiedByRunner'] = 2
        state['sameRunnerTwoCleanDirectories'] = True
        state['separateIndependentMachinesProven'] = False
        state['dockerServerVersion'] = run(['docker', 'version', '--format', '{{.Server.Version}}'])
        state['imageRepoDigests'] = json.loads(run(['docker', 'image', 'inspect', '--format', '{{json .RepoDigests}}', IMAGE]))
        state['containerToolVersions'] = run(['docker', 'run', '--rm', IMAGE, 'bash', '-c', 'rustc --version && cargo --version && solana --version && cargo-build-sbf --version'])
    except BaseException:
        state['status'] = 'BUILD_FAILED_OR_INTERRUPTED_NO_ACCEPTANCE'
        raise
    finally:
        (output / 'build-review.json').write_text(json.dumps(state, indent=2) + '\n')
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--plan', action='store_true')
    modes.add_argument('--check-runner', action='store_true')
    modes.add_argument('--build', action='store_true')
    modes.add_argument('--compare', nargs=2, metavar=('FIRST_ELF', 'SECOND_ELF'))
    parser.add_argument('--cli')
    parser.add_argument('--out')
    args = parser.parse_args()
    if args.plan:
        result = {'version': 110, 'sourceCommit': SOURCE, 'repository': REPOSITORY, 'image': IMAGE,
                  'cliVersion': '0.5.2', 'cliSHA256': CLI_SHA256, 'library': 'cp_amm', 'arch': 'v0',
                  'cargoFeaturesAdded': [], 'cleanBuildDirectories': 2,
                  'recipeStatus': 'INDEPENDENT_CANDIDATE_NOT_CONFIRMED_DEPLOYER_RECIPE',
                  'buildPerformed': False, 'currentChainRechecked': False, 'productionAccepted': False, 'MAINNET_GO': 'NO'}
    elif args.compare:
        result = compare(*args.compare)
    else:
        if not args.cli or (args.build and not args.out):
            parser.error('--cli is required; --build additionally requires a new --out directory')
        result = build(args.cli, args.out) if args.build else capabilities(args.cli)
    print(json.dumps(result, indent=2))
    return 1 if (args.compare or args.build) and result['status'] != 'ARTIFACTS_MATCH_RETAINED_PIN_ONLY' else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print('Build/comparison stopped: ' + str(error), file=sys.stderr)
        sys.exit(2)
