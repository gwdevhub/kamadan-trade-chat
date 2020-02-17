# ------------------ 	Amazon AWS Settings (vagrant up --provider=aws)		 	------------------
# NOTE: Some instance classes need to be in a VPC (Virtual Private Cloud) in order to be used. t2 instances are an example.
#		When running these instances, you need to have already set up a VPC on AWS, and got a subnet_id to put in below.
#		EC2 instances running inside a VPC need to be assigned an Elastic IP Address so vagrant can SSH in to deploy.
#		Consider the extra cost of this. e.g. t2.micro @ $0.014 per hour + elastic ip @ $0.005 per hour = $0.019 per hour total
#
#		There may be other charges for the VPC setup which are beyond the scope of Vagrant deployment - talk to a sys admin!!	
#
$AWS = $Project['AWS']
if Machines['AWS'].nil? == false && Machines['AWS'].empty? == false
	install_plugin('vagrant-aws',false)
	#-----------------
	#	Required attributes
	#-----------------
	abort_text = ''
	if $AWS['security_groups'].nil? || $AWS['security_groups'].empty?
		abort_text << "\n - Please define an array of 1 or more AWS Security Groups at the top of the Vagrantfile (e.g. $AWS['security_groups'] = ['my_security_group1','my_security_group2'])"
	end
	if $AWS['access_key_id'].nil? || $AWS['access_key_id'].empty?
		abort_text << "\n - Please define an AWS Access Key Id at the top of the Vagrantfile (e.g. $AWS['access_key_id'] = 'aabbcc')"
	end
	if $AWS['secret_access_key'].nil? || $AWS['secret_access_key'].empty?
		abort_text << "\n - Please define an AWS Secret Access Key at the top of the Vagrantfile (e.g. $AWS['secret_access_key'] = 'aabbcc')"
	end
	if not File.exists?("ssh/#{$AWS['keypair_name']}.ppk")
		abort_text << "\n - Failed to find ssh key for #{$AWS['keypair_name']}.ppk in the ssh directory. Make sure this key also exists relative to the Vagrantfile (e.g. ssh/#{$AWS['keypair_name']}.ppk)"
	end
	if $AWS['instance_type'].nil? || $AWS['instance_type'].empty?
		abort_text << "\n - Please define an AWS Instance Type at the top of the Vagrantfile (e.g. $AWS['instance_type'] = 'm1.small')"
	end
	if $AWS['costcentre'].nil? || $AWS['costcentre'].empty?
		abort_text << "\n - Please define a 'costcentre' tag for the AWS Instance at the top of the Vagrantfile, used to identify which client to bill to  (e.g. $AWS['costcentre'] = 'ACME Corporation')"
	end
	if(abort_text.length > 0)
		final_abort_text << "\nAWS Errors:\n#{abort_text}\n\nPlease resolve the above errors, or remove any AWS machines from the Vagrantfile to continue.\n"
	end

	# -------------- Configure each machine with the relevent details -------------- #
	Vagrant.configure("2") do |config|
		Machines['AWS'].each do |machine_name,machine_properties|
			config.vm.define machine_name do |machine|
				machine.vm.box_url = "file://#{plugin_dir('vagrant-aws')}/box/dummy.box"
				machine.vm.box = 'aws-dummy'
				cloud_machine_setup(machine,machine_name,machine_properties);

				config.vm.provider :aws do |aws, override|
					aws.instance_type = machine_properties['instance_type'] || $AWS['instance_type']
					aws.region = machine_properties['region'] || $AWS['region']
					aws.ami = machine_properties['ami'] || $AWS['ami']
					if machine_properties['spot_instance'] || $AWS['spot_instance']
						aws.spot_instance = machine_properties['spot_instance'] || $AWS['spot_instance']
					end
					if machine_properties['spot_max_price'] || $AWS['spot_max_price']
						aws.spot_max_price = machine_properties['spot_max_price'] || $AWS['spot_max_price']
					end
					if machine_properties['spot_valid_until'] || $AWS['spot_valid_until']
						aws.spot_valid_until = machine_properties['spot_valid_until'] || $AWS['spot_valid_until']
					end
					if machine_properties['availability_zone'] || $AWS['availability_zone']
						aws.availability_zone = machine_properties['availability_zone'] || $AWS['availability_zone']
					end
					if machine_properties['block_device_mapping'] || $AWS['block_device_mapping']
						aws.block_device_mapping = machine_properties['block_device_mapping'] || $AWS['block_device_mapping']
					end
					tags_to_add = {
						'Name' => "#{$Project['name'].gsub(/\s+/, "-")}-#{machine_name}-#{Time.now.to_i}".downcase,
						'costcentre' => $Project['costcentre'],
						'repository' => "#{$Project['repository']} (#{machine_properties['branch'] || 'master'})"
					}
					aws.tags = tags_to_add
				end
			end
		end
		config.vm.provider :aws do |aws, override|
			aws.access_key_id = $AWS['access_key_id']
			aws.secret_access_key = $AWS['secret_access_key']
			aws.keypair_name = $AWS['keypair_name']
			aws.security_groups = $AWS['security_groups']
			
			override.ssh.username = "ubuntu"
			override.ssh.private_key_path = "ssh/#{$Project['keypair_name']}.ppk"
		end
	end
end
