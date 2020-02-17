# ------------------ 	Google Cloud Settings (vagrant up --provider=google)		 	------------------
$GoogleCloud = $Project['GoogleCloud']
if Machines['GoogleCloud'].nil? == false && Machines['GoogleCloud'].empty? == false
	require_plugin('vagrant-google',false)
	if $GoogleCloud['google_json_key_location'] && File.exist?($GoogleCloud['google_json_key_location'])
		google_json = JSON.parse(File.read($GoogleCloud['google_json_key_location']))
		$GoogleCloud['google_project_id'] = google_json['project_id']
		$GoogleCloud['google_client_email'] = google_json['client_email']
	end

	# -------------- Configure each machine with the relevent details -------------- #
	Vagrant.configure("2") do |config|
		Machines['GoogleCloud'].each do |machine_name,machine_properties|
		
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-google')}/box/google.box"
				machine.vm.box = 'google-cloud-dummy'
				
				machine_properties['is_cloud'] = machine_properties['server_config']['is_cloud'] = 1
				machine_properties['is_google'] = machine_properties['server_config']['is_google'] = 1
				machine_properties['is_local'] = machine_properties['server_config']['is_local'] = 0
				
				cloud_machine_setup(machine,machine_name,machine_properties);

				config.vm.provider :google do |google, override|
					
					google.google_project_id = $GoogleCloud['google_project_id']
					google.google_client_email = $GoogleCloud['google_client_email']
					google.google_json_key_location = $GoogleCloud['google_json_key_location']
					
					google.machine_type = machine_properties['machine_type'] || $GoogleCloud['machine_type']
					# Make sure to set this to trigger the zone_config
					google.zone = $GoogleCloud['zone']
					google.zone_config google.zone do |zone|
						zone.image_family = $GoogleCloud['image_family']
						zone.image_project_id = $GoogleCloud['image_project_id']
					end
					google.tags = ['http-server','https-server']
					#google.tags = {
					#	'costcentre'=>$Project['costcentre'],
					#	'repository'=>"#{$Project['repository']} (#{machine_properties['branch'] || 'master'})"
					#}
					google.metadata = {"sshKeys" => ["vagrant:#{File.read("ssh/#{$Project['keypair_name']}.pub")}"]}
					google.disk_size = machine_properties['disk_size'] || $GoogleCloud['disk_size']
					project_name_sanitised = $Project['name'].gsub(/\s+/, "-")
					google.name = "#{project_name_sanitised}-#{machine_name}-#{Time.now.to_i}".downcase
				end
			end
		end
		config.vm.provider :google do |google, override|
			override.ssh.username="vagrant"
			override.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
		end
	end
end