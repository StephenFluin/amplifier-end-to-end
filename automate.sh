#!/bin/bash

# Number of iterations
iterations=10

for ((i = 1; i <= $iterations; i++)); do
    echo "Iteration $i:"
    ../ampd/onboard.sh
    ./ae2e test-rotation -c avalanche -p
    ./ae2e test-rotation -c ethereum-sepolia -p
    #./ae2e test-rotation -c op-sepolia -p
    ../ampd/offboard.sh
    ./ae2e test-rotation -c avalanche -p
    ./ae2e test-rotation -c ethereum-sepolia -p
    #./ae2e test-rotation -c op-sepolia -p

    # op sepolia removed because +2 -2 verifiers means we don't have enough votes to pass threshold

    if [ $i -lt $iterations ]; then
        echo "Sleeping for 30 minutes..."
        sleep 1800 # 30 minutes * 60 seconds/minute
    fi
done
