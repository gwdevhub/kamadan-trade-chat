# ------------------ Linode Settings (vagrant up --provider=linode) ------------------
# See https://github.com/displague/vagrant-linode for Documentation
$Linode = {
	'plan' => 'Nanode 1GB',																	# Server Size to use
	'distribution' => 'Debian 8',														# Operating system to run
	'datacenter' => 'singapore',														# Physical location of server
	'api_key' => 't103hrBLED7xjvmn3wxh0tMNw4NmhbkdO75Wdm5GJg2jKsxZd7FYvbwNggCp76LE',	# Linode account api_key
}
# ------------------ DO NOT EDIT BELOW THIS LINE ------------------
if Machines['Linode'].nil? == false && Machines['Linode'].empty? == false
	Vagrant.configure("2") do |config|
		Machines['Linode'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-linode')}/box/linode.box"
				machine.vm.box = 'linode-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);

				config.vm.provider :linode do |linode, override|
					override.distribution = machine_properties['distribution'] || $Linode['distribution'] || linode.distribution
					override.datacenter = machine_properties['datacenter'] || $Linode['datacenter'] || linode.datacenter
					override.plan = machine_properties['plan'] || $Linode['plan'] || linode.plan
					override.api_key = $Linode['api_key']
					override.ssh_key_name = $Project['ssh_key_name']
					override.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
					project_name_sanitised = $Project['name'].gsub(/\s+/, "_")
					override.label = "#{project_name_sanitised}_#{machine_name}_#{Time.now.to_i}"
				end
			end
		end
	end
end