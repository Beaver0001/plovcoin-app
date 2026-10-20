#!/usr/bin/env python3
"""Exercise artifact comparison and actual pinned CLI; never execute a Docker build."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cli', required=True)
parser.add_argument('--fixture', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent
script = root / 'build-compare-v110.py'
cli = pathlib.Path(args.cli).resolve()
original = pathlib.Path(args.fixture).read_bytes()
pin = json.loads((root / 'live-program-pin-v109.json').read_text())
assert hashlib.sha256(original).hexdigest() == pin['elfSHA256']
tests = []


def check(name, arguments, expected):
    result = subprocess.run([sys.executable, str(script), *map(str, arguments)], capture_output=True, text=True, timeout=60)
    assert result.returncode == expected, (name, result.stdout, result.stderr)
    tests.append({'name': name, 'exitCode': result.returncode, 'pass': True})
    return json.loads(result.stdout) if result.stdout else None


with tempfile.TemporaryDirectory(prefix='plov-v110-') as directory:
    work = pathlib.Path(directory)
    a, b = work / 'first.so', work / 'second.so'
    a.write_bytes(original)
    b.write_bytes(original)
    result = check('Equal copied ELF compares without source provenance/current chain/GO', ['--compare', a, b], 0)
    assert result['bothMatchRetainedV109NormalizedHash'] and result['twoArtifactFilesByteIdentical']
    assert not result['sourceBuildProvenanceVerifiedByComparison'] and not result['currentChainRechecked'] and not result['productionAccepted']
    b.write_bytes(original + b'\0')
    check('Different full bytes with equal normalized hash are not two identical builds', ['--compare', a, b], 1)
    modified = bytearray(original)
    modified[100] ^= 1
    b.write_bytes(modified)
    check('One changed code byte rejects', ['--compare', a, b], 1)
    a.write_bytes(modified)
    check('Two identical wrong binaries reject retained hash', ['--compare', a, b], 1)
    check('Same file aliases reject', ['--compare', a, a], 2)
    b.write_bytes(b'X' * 80)
    check('Non ELF rejects', ['--compare', a, b], 2)
    check('Missing file rejects', ['--compare', a, work / 'absent.so'], 2)
    check('Wrong CLI checksum rejects', ['--check-runner', '--cli', b], 2)
    capability = check('Actual pinned CLI capability read does not claim a build', ['--check-runner', '--cli', cli], 0)
    assert not capability['buildPerformed'] and not capability['productionAccepted']
    if not capability['readyForCandidateBuild']:
        check('Build stops without capability before output creation', ['--build', '--cli', cli, '--out', work / 'not-created'], 2)
        assert not (work / 'not-created').exists()
    official_hash = subprocess.check_output([str(cli), 'get-executable-hash', str(pathlib.Path(args.fixture).resolve())], text=True, timeout=30).strip()
    assert official_hash == pin['zeroTrimmedElfSHA256'] == hashlib.sha256(original.rstrip(b'\0')).hexdigest()
    tests.append({'name': 'Official CLI hash agrees with Python normalization and retained v109', 'pass': True})

report = {'version': 110, 'status': 'LOCAL_TOOL_CHECKS_PASS_BUILD_NOT_RUN', 'checks': len(tests), 'tests': tests,
          'scriptSHA256': hashlib.sha256(script.read_bytes()).hexdigest(), 'actualCLIExecuted': True,
          'officialCLIHash': official_hash, 'dockerBuildsRun': 0, 'sourceBuildParityProven': False,
          'rpcCalls': 0, 'networkSends': 0, 'MAINNET_GO': 'NO'}
(root / 'build-tool-checks-v110.json').write_text(json.dumps(report, indent=2) + '\n')
(root / 'build-runner-capability-v110.json').write_text(json.dumps(capability, indent=2) + '\n')
print(json.dumps({'checks': len(tests), 'pass': True, 'dockerBuildsRun': 0}))
