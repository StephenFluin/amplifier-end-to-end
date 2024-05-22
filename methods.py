import subprocess
import sys
import subprocess
import sys

import platform
import os
import requests

package = "haiyizxx/tofnd:latest"
ampd_paths = {
    'linux': 'https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-linux-amd64-v0.1.0',
    'darwin-i386': 'https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-amd64-v0.1.0',
    'darwin-arm64': 'https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-arm64-v0.1.0',
}

def check_docker_installed():
    try:
        subprocess.run(['docker', '--version'], check=True, stderr=None,stdout=None)
        print("Docker is installed.")
    except ( subprocess.CalledProcessError, FileNotFoundError):
        print("Docker is not installed.")
        print("Please follow the installation instructions at: https://docs.docker.com/get-docker/")
        sys.exit(1)


def run_tofnd():
    try:
        subprocess.run(['docker', 'pull', package], check=True)
        process = subprocess.Popen(['docker', 'run', '-p', '50051:50051', '--env', 'MNEMONIC_CMD=auto', '--env', 'NOPASSWORD=true', '-v', 'tofnd:/.tofnd', 'haiyizxx/tofnd:latest'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        while True:
            output = process.stdout.readline().decode()
            print(output.strip())
            if 'tofnd listen addr 0.0.0.0:50051' in output:
                print("Docker commands executed successfully.")
                break
            if process.poll() is not None:
                break
        if process.poll() and 'tofnd listen addr 0.0.0.0:50051' not in output:
            print("Error executing Docker commands.")
            sys.exit(1)
    except subprocess.CalledProcessError:
        print("Error executing Docker commands.")
        sys.exit(1)

def stop_all_dockers():
    try:
        instance = subprocess.run(['docker', 'ps', '-q', '--filter', 'ancestor=' + package], check=True, capture_output=True, text=True).stdout.strip()
        if(len(instance) == 0):
            # print("No running docker instances found.")
            return
        else:
            print ("Stopping and removing docker instance: ", instance)
        process = subprocess.run(['docker', 'stop', instance], check=True,stdout=None,stderr=None)
        process = subprocess.run(['docker', 'remove', instance], check=True)
    except subprocess.CalledProcessError as err:
        print("process err is ",err);

# Based on the current system platform, download the right file from `ampd_paths`
def download_ampd():
    system = platform.system().lower()
    if system == 'darwin':
        system += '-' + platform.machine().lower()
    if system not in ampd_paths:
        print(f"Unsupported system: {system}")
        sys.exit(1)

    url = ampd_paths[system]
    filename = url.split('/')[-1]
    if os.path.exists(filename):
        # Already exists, all done
        return

    print(f"Downloading {filename} from {url}")
    response = requests.get(url)
    with open(filename, 'wb') as f:
        f.write(response.content)
    print(f"Downloaded {filename}")

    os.chmod(filename, 0o755)
    symlink_name = 'ampd'
    if not os.path.exists(symlink_name):
        os.symlink(filename, symlink_name) 

# Copy `devnet-verifiers-config.toml` to `~/.ampd/config.toml`
def configure_ampd():
    if not os.path.exists('devnet-verifiers-config.toml'):
        print("Error: devnet-verifiers-config.toml not found.")
        sys.exit(1)

    if not os.path.exists(os.path.expanduser('~/.ampd')):
        os.makedirs(os.path.expanduser('~/.ampd'))

    if os.path.exists(os.path.expanduser('~/.ampd/config.toml')):
        print("Error: ~/.ampd/config.toml already exists.")
        sys.exit(1)

    print("Copying devnet-verifiers-config.toml to ~/.ampd/config.toml")
    os.rename('devnet-verifiers-config.toml', os.path.expanduser('~/.ampd/config.toml'))
    print("Copied devnet-verifiers-config.toml to ~/.ampd/config.toml")
    
