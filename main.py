
import verifier
import integrator as i
import relayer_sourcechain as source
import relayer_axelar as axelar

# Integrator Process
def setup_integration():
    # source.deploy_source_gateway()
    # axelar.instantiate_contracts()
    # print("Please fill out form)
    # setup_verifier()
    # axelar.update_worker_set()
    # source.rotate_signers(axelar.get_worker_set_proof)
    # axelar.supply_rewards()
    # verifier.run_ampd()
    # source.create_tx()
    # axelar.verify_messages()
    # axelar.route_messages()
    # axelar.construct_proof()
    # source.approve_messages(axelar.get_message_proof())
    # source.execute()
    # axelar.distribute_rewards()

    pass


# Verifier Process
def setup_verifier():
    verifier.check_docker_installed()
    verifier.run_tofnd()
    verifier.download_ampd()
    verifier.configure_ampd()
    verifier.print_worker_address()
    verifier.bond_and_register()
    print("Finished setting up verifier")
    print("Now fill out the form here:")
    print("https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform")

setup_verifier()





