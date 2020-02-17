$Rackspace = $Project['rackspace']



# -------------- Configure each machine with the relevent details -------------- #
Vagrant.configure("2") do |config|
	#-------------
	# Rackspace Setup (vagrant up --provider=rackspace)
	#-------------
	if Machines['Rackspace'].nil? == false && Machines['Rackspace'].empty? == false
		install_plugin('vagrant-rackspace',false)
		Machines['Rackspace'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-rackspace')}/box/dummy.box"
				machine.vm.box = 'rackspace-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);
				
				config.vm.provider :rackspace do |rackspace, override|
					rackspace.username = machine_properties['username'] || $Rackspace['username']
					rackspace.api_key  = machine_properties['api_key'] || $Rackspace['api_key']
					rackspace.flavor   = machine_properties['flavor'] || $Rackspace['flavor']
					rackspace.image    = machine_properties['image'] || $Rackspace['image']
					rackspace.rackspace_region   = $Rackspace['region']
					rackspace.key_name = $Rackspace['keypair_name']
					
					override.ssh.private_key_path = "ssh/#{$Rackspace['keypair_name']}.ppk"
					rackspace.metadata = {
						'Name' => "#{$Project['name'].gsub(/\s+/, "-")}-#{machine_name}-#{Time.now.to_i}".downcase,
						'costcentre' => $Project['costcentre'],
						'repository' => "#{$Project['repository']} (#{machine_properties['branch'] || 'master'})"
					}
				end
			end
		end
	end
	#-------------
	# Rackspace Setup (vagrant up --provider=linode)
	#-------------
	if Machines['Linode'].nil? == false && Machines['Linode'].empty? == false
		install_plugin('vagrant-linode',false)
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