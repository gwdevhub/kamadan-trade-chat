# -------------- Configure each machine with the relevent details -------------- #
$project_name_sanitised = $Project['name'].gsub(/\s+/, "_");
Vagrant.configure("2") do |config|
	#-------------
	# Rackspace Setup (vagrant up --provider=rackspace)
	# https://github.com/mitchellh/vagrant-rackspace
	# Used for creating deploying code to machines hosted on Rackspace
	#-------------
	if Machines['Rackspace'].nil? == false && Machines['Rackspace'].empty? == false
		$Rackspace = $Project['rackspace'] || abort("Missing rackspace array in Project.rb")
		install_plugin('vagrant-rackspace',false)
		Machines['Rackspace'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-rackspace')}/box/dummy.box"
				machine.vm.box = 'rackspace-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);
				
				machine.vm.provider :rackspace do |rackspace|
					rackspace.username = machine_properties['username'] || $Rackspace['username'] || abort("Missing username for rackspace server #{machine_name}")
					rackspace.api_key  = machine_properties['api_key'] || $Rackspace['api_key'] || abort("Missing api_key for rackspace server #{machine_name}")
					rackspace.flavor   = machine_properties['flavor'] || $Rackspace['flavor'] || abort("Missing flavor for rackspace server #{machine_name}")
					rackspace.image    = machine_properties['image'] || $Rackspace['image'] || abort("Missing image for rackspace server #{machine_name}")
					rackspace.rackspace_region   = $Rackspace['region'] || abort("Missing region for rackspace server #{machine_name}")
					rackspace.key_name = $Project['keypair_name'] || abort("Missing keypair_name for linode server #{machine_name}")
					rackspace.ssh.private_key_path = "ssh/#{$Project['keypair_name']}.ppk"
					rackspace.metadata = {
						'Name' => "#{$project_name_sanitised}-#{machine_name}-#{Time.now.to_i}".downcase,
						'costcentre' => $Project['costcentre'],
						'repository' => "#{$Project['repository']} (#{machine_properties['branch'] || 'master'})"
					}
				end
			end
		end
	end
	#-------------
	# Linode Setup (vagrant up --provider=linode)
	# https://github.com/mitchellh/vagrant-linode
	# Used for creating deploying code to machines hosted on Linode
	#-------------
	if Machines['Linode'].nil? == false && Machines['Linode'].empty? == false
		$Linode = $Project['linode'] || $Project['Linode'] || abort("Missing linode array in Project.rb")
		install_plugin('vagrant-linode',false)
		Machines['Linode'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-linode')}/box/linode.box"
				machine.vm.box = 'linode-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);

				machine.vm.provider :linode do |linode|
					linode.distribution = machine_properties['distribution'] || $Linode['distribution'] || abort("Missing distribution for linode server #{machine_name}")
					linode.datacenter = machine_properties['datacenter'] || $Linode['datacenter'] || abort("Missing datacenter for linode server #{machine_name}")
					linode.plan = machine_properties['plan'] || $Linode['plan'] ||  abort("Missing plan for linode server #{machine_name}")
					linode.api_key = $Linode['api_key'] || abort("Missing api_key for linode server #{machine_name}")
					linode.ssh_key_name = $Project['keypair_name'] || abort("Missing keypair_name for linode server #{machine_name}")
					linode.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
					linode.private_key_path = linode.ssh.private_key_path
					linode.label = "#{$project_name_sanitised}_#{machine_name}_#{Time.now.to_i}"
				end
			end
		end
	end
	#-------------
	# GoogleCloud Setup (vagrant up --provider=google)
	# https://github.com/mitchellh/vagrant-google
	# Used for creating deploying code to machines hosted on Google Cloud
	#-------------
	if Machines['GoogleCloud'].nil? == false && Machines['GoogleCloud'].empty? == false
		$GoogleCloud = $Project['GoogleCloud'] || abort("Missing GoogleCloud array in Project.rb")
		if $GoogleCloud['google_json_key_location'] && File.exist?($GoogleCloud['google_json_key_location'])
			google_json = JSON.parse(File.read($GoogleCloud['google_json_key_location']))
			$GoogleCloud['google_project_id'] = google_json['project_id']
			$GoogleCloud['google_client_email'] = google_json['client_email']
		end
		require_plugin('vagrant-google',false)
		Machines['GoogleCloud'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-google')}/box/google.box"
				machine.vm.box = 'google-cloud-dummy'
				
				cloud_machine_setup(machine,machine_name,machine_properties);

				machine.vm.provider :google do |google|
					google.google_project_id = $GoogleCloud['google_project_id'] || abort("Missing google_project_id for Google Cloud server #{machine_name}")
					google.google_client_email = $GoogleCloud['google_client_email'] || abort("Missing google_client_email for Google Cloud server #{machine_name}")
					google.machine_type = machine_properties['machine_type'] || $GoogleCloud['machine_type'] || abort("Missing machine_type for Google Cloud server #{machine_name}")
					# Make sure to set this to trigger the zone_config
					google.zone = $GoogleCloud['zone'] || abort("Missing zone for Google Cloud server #{machine_name}")
					google.zone_config google.zone do |zone|
						zone.image_family = $GoogleCloud['image_family'] || abort("Missing image_family for Google Cloud server #{machine_name}")
						zone.image_project_id = $GoogleCloud['image_project_id'] || abort("Missing image_project_id for Google Cloud server #{machine_name}")
					end
					google.tags = ['http-server','https-server']
					google.disk_size = machine_properties['disk_size'] || $GoogleCloud['disk_size'] || abort("Missing disk_size for Google Cloud server #{machine_name}")
					google.name = "#{$project_name_sanitised}-#{machine_name}-#{Time.now.to_i}".downcase
					
					google.metadata = {"sshKeys" => ["vagrant:#{File.read("ssh/#{$Project['keypair_name']}.pub")}"]}
				end
				machine.ssh.username="vagrant"
				machine.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
			end
		end
	end
	#-------------
	# AWS Setup (vagrant up --provider=aws)
	# https://github.com/mitchellh/vagrant-aws
	# Used for creating deploying code to machines hosted on Amazon Web Services
	#-------------
	if Machines['AWS'].nil? == false && Machines['AWS'].empty? == false
		$AWS = $Project['AWS'] || abort("Missing AWS array in Project.rb")
		require_plugin('vagrant-aws',false)
		Machines['AWS'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-aws')}/box/dummy.box"
				machine.vm.box = 'aws-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);

				machine.vm.provider :aws do |aws|
					aws.instance_type = machine_properties['instance_type'] || $AWS['instance_type'] || abort("Missing instance_type for AWS server #{machine_name}")
					aws.region = machine_properties['region'] || $AWS['region'] || abort("Missing region for AWS server #{machine_name}")
					aws.ami = machine_properties['ami'] || $AWS['ami'] || abort("Missing ami for AWS server #{machine_name}")
					aws.availability_zone = machine_properties['availability_zone'] || $AWS['availability_zone'] || abort("Missing availability_zone for AWS server #{machine_name}")
					aws.block_device_mapping = machine_properties['block_device_mapping'] || $AWS['block_device_mapping'] || nil
					aws.access_key_id = $AWS['access_key_id'] || abort("Missing access_key_id for AWS server #{machine_name}")
					aws.secret_access_key = $AWS['secret_access_key'] || abort("Missing secret_access_key for AWS server #{machine_name}")
					aws.security_groups = $AWS['security_groups'] || abort("Missing security_groups for AWS server #{machine_name}")
			
					aws.spot_instance = machine_properties['spot_instance'] || $AWS['spot_instance'] || nil
					aws.spot_max_price = machine_properties['spot_max_price'] || $AWS['spot_max_price'] || nil
					aws.spot_valid_until = machine_properties['spot_valid_until'] || $AWS['spot_valid_until'] || nil
					
					aws.tags = {
						'Name' => "#{$project_name_sanitised}-#{machine_name}-#{Time.now.to_i}".downcase,
						'costcentre' => $Project['costcentre'],
						'repository' => "#{$Project['repository']} (#{machine_properties['branch'] || 'master'})"
					}
					
					aws.keypair_name = $Project['keypair_name'] || abort("Missing keypair_name for AWS server #{machine_name}")
					
				end
				machine.ssh.username = "ubuntu"
				machine.ssh.private_key_path = "ssh/#{$Project['keypair_name']}.ppk"
			end
		end
	end
	#-------------
	# Managed Server Setup (vagrant up --provider=managed)
	# https://github.com/tknerr/vagrant-managed-servers
	# Used for deploying code to existing servers, e.g. a shared host.
	#-------------
	if Machines['ManagedServers'].nil? == false && Machines['ManagedServers'].empty? == false
		require_plugin('vagrant-managed-servers',false)
	
		Machines['ManagedServers'].each do |machine_name,machine_properties|	
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-managed-servers')}/dummy.box"
				machine.vm.box = 'managed-server-dummy'
				machine.vm.guest = machine_properties['os'] || abort("Missing os property for managed server #{machine_name}")
				cloud_machine_setup(machine,machine_name,machine_properties);
				
				machine.ssh.username = machine_properties['ssh_username'] || 'vagrant'
				if machine_properties['ssh_password']
					machine.ssh.password = machine_properties['ssh_password']
					machine.ssh.private_key_path = nil
				else
					machine.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
				end
				machine.ssh.sudo_command = "#{machine_properties['sudo_command'] || ''} %c"
				machine.ssh.insert_key = false
				machine.vm.provider :managed do |managed|
					managed.server = machine_properties['ssh_address'] || machine_properties['ip_address'] || machine_properties['ip'] || machine_properties['hostnames'][0].split(",")[0]
				end
			end
		end
	end
end