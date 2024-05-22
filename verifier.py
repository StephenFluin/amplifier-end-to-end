import subprocess
import sys
import subprocess
import sys

import platform
import os
import requests

import shutil
import re

package = "haiyizxx/tofnd:latest"
ampd_paths = {
    "linux": "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-linux-amd64-v0.1.0",
    "darwin-i386": "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-amd64-v0.1.0",
    "darwin-arm64": "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-arm64-v0.1.0",
}


verbose = True

if verbose:
    print("Using verbose mode")
else:
    pass


def check_docker_installed():
    try:
        subprocess.run(["docker", "--version"], check=True, capture_output=True)
        if verbose:
            print("Docker is installed.")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Docker is not installed.")
        print(
            "Please follow the installation instructions at: https://docs.docker.com/get-docker/"
        )
        sys.exit(1)


def run_tofnd():
    stop_all_dockers()
    try:
        subprocess.run(["docker", "pull", package], check=True, capture_output=True)
        if verbose:
            print(subprocess)
        process = subprocess.Popen(
            [
                "docker",
                "run",
                "-p",
                "50051:50051",
                "--env",
                "MNEMONIC_CMD=auto",
                "--env",
                "NOPASSWORD=true",
                "-v",
                "tofnd:/.tofnd",
                "haiyizxx/tofnd:latest",
            ],
            stdout=subprocess.PIPE,
            stderr=sys.stderr,
        )

        while True:
            output = process.stdout.readline().decode()
            if verbose:
                print(output.strip())
            if "tofnd listen addr 0.0.0.0:50051" in output:
                if verbose:
                    print("Docker commands executed successfully.")
                break
            if process.poll() is not None:
                break
        if process.poll() and "tofnd listen addr 0.0.0.0:50051" not in output:
            print("Error executing Docker commands.")
            sys.exit(1)
    except subprocess.CalledProcessError:
        print("Error executing Docker commands.")
        sys.exit(1)


# @TODO: Maybe re-use the existing docker instance instead of creating a new one
def stop_all_dockers():
    try:
        instance = subprocess.run(
            ["docker", "ps", "-q", "--filter", "ancestor=" + package],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        if len(instance) == 0:
            # print("No running docker instances found.")
            return
        else:
            print("Stopping and removing docker instance: ", instance)
        subprocess.run(
            ["docker", "stop", instance],
            check=True,
            capture_output=True,
        )
        subprocess.run(["docker", "remove", instance], check=True, capture_output=True)
    except subprocess.CalledProcessError as err:
        print("process err is ", err)


# Based on the current system platform, download the right file from `ampd_paths`
def download_ampd():
    system = platform.system().lower()
    if system == "darwin":
        system += "-" + platform.machine().lower()
    if system not in ampd_paths:
        print(f"Unsupported system: {system}")
        sys.exit(1)

    url = ampd_paths[system]
    filename = url.split("/")[-1]
    if os.path.exists(filename):
        # Already exists, all done
        print("ampd already exists, not downloading")
        pass
    else:
        print(f"Downloading {filename} from {url}")
        response = requests.get(url)
        with open(filename, "wb") as f:
            f.write(response.content)
        if verbose:
            print(f"Downloaded {filename}")

    os.chmod(filename, 0o755)
    symlink_name = "ampd"
    if not os.path.exists(symlink_name):
        os.symlink(filename, symlink_name)
        if verbose:
            print("'ampd' symlink created")


# Copy `devnet-verifiers-config.toml` to `~/.ampd/config.toml`
def configure_ampd():
    if not os.path.exists("devnet-verifiers-config.toml"):
        print("Error: devnet-verifiers-config.toml not found.")
        sys.exit(1)

    if not os.path.exists(os.path.expanduser("~/.ampd")):
        os.makedirs(os.path.expanduser("~/.ampd"))

    if os.path.exists(os.path.expanduser("~/.ampd/config.toml")):
        if verbose:
            print("Not rewriting config.toml: ~/.ampd/config.toml already exists.")
    else:
        shutil.copyfile(
            "devnet-verifiers-config.toml", os.path.expanduser("~/.ampd/config.toml")
        )
        print("Copied devnet-verifiers-config.toml to ~/.ampd/config.toml")


# Call `./ampd worker-address` to find the wallet address
def print_worker_address():
    worker_address = "unknown"
    try:
        process = subprocess.Popen(
            ["./ampd", "worker-address"], stdout=subprocess.PIPE, stderr=sys.stderr
        )
        while True:
            output = process.stdout.readline().decode().strip()
            if verbose:
                print(output)
            if "worker address" in output:
                break
            if process.poll() is not None:
                break
        if process.poll() and "worker address" not in output:
            print("Error finding wallet address")
            sys.exit(1)
        else:
            ## match the string after 'worker address:'
            worker_address = output.split("worker address: ")[1]
    except subprocess.CalledProcessError:
        print("Error executing find wallet address command")
        sys.exit(1)

    print(f"Your worker address is {worker_address}.")
    balance = check_wallet_balance(worker_address)
    # print(f"You have {balance} tokens in your wallet.")
    if balance != "0":
        print(f"You already have {balance} tokens in your wallet, no need to fund it.")
        return

    print(
        "Visit https://discord.com/channels/770814806105128977/1002423218772136056/1217885883152334918 and fund this wallet with:"
    )
    print(f"!faucet devnet-verifiers {worker_address}")


def check_wallet_balance(address):
    try:
        process = subprocess.run(
            [
                "axelard",
                "q",
                "bank",
                "balances",
                address,
                "--node",
                "http://devnet-verifiers.axelar.dev:26657",
            ],
            capture_output=True,
            text=True,
        )
        balance = re.findall(r'amount: "(\d+)"', process.stdout)[0]
        if process.returncode != 0:
            print("Error checking wallet balance")
            sys.exit(1)
        return balance
    except subprocess.CalledProcessError:
        print("Error executing wallet balance command")
        sys.exit(1)


def bond_and_register():
    try:
        bonding = subprocess.run(
            ["./ampd", "bond-worker", "validators", "100", "uverifiers"],
            check=True,
            text=True,
            capture_output=True,
        )
        if verbose:
            print("Bonded worker")
        registering = subprocess.run(
            ["./ampd", "register-public-key"],
            check=False,
            text=True,
            capture_output=True,
        )
        if re.findall(
            r".*public key is already registered.*",
            registering.stdout,
            flags=re.MULTILINE,
        ):
            print("Public key already registered")
        elif registering.returncode != 0:
            print(
                "Error registering public key",
                "stdout is:",
                registering.stdout,
                "stderr is:",
                registering.stderr,
            )
        else:
            print("Registered public key")
        supportAvalanche = subprocess.run(
            ["./ampd", "register-chain-support", "validators", "avalanche"],
            check=True,
            text=True,
            capture_output=True,
        )
        supportFantom = subprocess.run(
            ["./ampd", "register-chain-support", "validators", "fantom"],
            check=True,
            text=True,
            capture_output=True,
        )
        if verbose:
            print("Registered avalanche and fantom chain support")
    except subprocess.CalledProcessError as err:
        print("Error executing bond and register commands", err)
        sys.exit(1)
    print(
        "Finished bonding, registering key, and registering support for avalanche and fantom"
    )


def run(command, find=None, check=False):
    try:
        process = subprocess.run(command, capture_output=True, text=True, check=check)
        if process.returncode != 0:
            print("Error executing command")
            sys.exit(1)
        return process
    except subprocess.CalledProcessError:
        print("Error executing command", command)
        sys.exit(1)
