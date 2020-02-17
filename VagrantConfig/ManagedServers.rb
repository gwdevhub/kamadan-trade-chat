# ------------------ 	Managed Server Settings (vagrant up --provider=managed)		 	------------------
if Machines['ManagedServers'].nil? == false && Machines['ManagedServers'].empty? == false
	require_plugin('vagrant-managed-servers',false)
	# abort(vagrant_home())
	# -------------- Configure each machine with the relevent details -------------- #
	Vagrant.configure("2") do |config|
		Machines['ManagedServers'].each do |machine_name,machine_properties|	
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-managed-servers')}/dummy.box"
				machine.vm.box = 'managed-server-dummy'
				machine.vm.guest = machine_properties['os'] || 'linux' || abort("Missing os property for managed server '#{machine_name}'")
				machine.ssh.username = machine_properties['ssh_username'] || 'vagrant'
				if machine_properties['ssh_password']
					machine.ssh.password = machine_properties['ssh_password']
					machine.ssh.private_key_path = nil
				else
					machine.ssh.private_key_path = [machine_properties['ssh_private_key'] || "ssh/#{$Project['keypair_name']}"]
				end
				machine.ssh.sudo_command = "%c"
				machine.ssh.insert_key = false
				
				cloud_machine_setup(machine,machine_name,machine_properties);
				
				machine.vm.provider :managed do |managed, override|
					managed.server = machine_properties['ip_address'] || machine_properties['ip'] || machine_properties['hostnames'][0].split(",")[0]
				end
			end
		end
	end
end