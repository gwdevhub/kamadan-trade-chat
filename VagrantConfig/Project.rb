# ------------------	MAIN PROJECT VARIABLES	------------------
$Project = {
	'repository' => '',																			# Location of hosted code. Cloned on deployment server using the below keypair.
	'branch' => 'master',																		# Default branch in the above repository to pull from.
	'keypair_name' => '3vcloud_ssh_key',														# SSH Keypair, used for access to Servers for deployment.
	'name'=>'Kamadan Trade Chat',																# Project name, used to describe any instances on AWS or Rackspace
	'costcentre'=>'3vcloud',																	# Instances are tagged with the costcentre for billing purposes - who should be billed for the server(s)
	'AWS' =>{ 																					# ---------- AWS config - https://github.com/mitchellh/vagrant-aws 
		'instance_type' => 't2.micro',															# 	https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html
		'ami' => 'ami-035966e8adab4aaad',																#	https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html
		'region'=>'eu-west-1',																	# 	https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html
		'availability_zone'=>'1',
    'access_key_id'=>'aaaa',																
		'secret_access_key'=>'aaaa',															
		'security_groups' => ['default'],														# 	Every server needs a valid security group - create this on AWS first
		'block_device_mapping' => [{ 'DeviceName' => '/dev/sda1', 'Ebs.VolumeSize' => 20 }],	# 	Size of root disk
    'spot_max_price' => '0.01'
	},
	'GoogleCloud'=> {																			# ---------- Google Cloud config - https://github.com/mitchellh/vagrant-google
		'google_json_key_location' => nil,														#	Provide location on disk of your Google JSON credentials from https://console.cloud.google.com/apis/credentials
		'google_project_id'=> nil,																#	...OR provide the Google Project ID *AND* the client email.
		'google_client_email'=>nil,																#	...OR provide the Google Project ID *AND* the client email.
		'image_family' => 'debian-8',															# 	https://console.cloud.google.com/compute/images
		'image_project_id' => 'debian-cloud',
		'disk_size' => 10,
		'machine_type' => 'f1-micro',															# 	https://cloud.google.com/compute/docs/machine-types
		'zone' => 'europe-west2-a'																# 	https://cloud.google.com/compute/docs/regions-zones/
	},
	'Rackspace' => {																			# ---------- Rackspace Server config - https://github.com/mitchellh/vagrant-rackspace
		'flavor' => '1GB Standard Instance',													#	https://www.rackspace.com/cloud/servers/pricing
		'image' => 'a41b3d62-5f7b-4697-a4a7-ca2bbf965a06', 										# 	Ubuntu 14.04 LTS (PVHVM)
		'region' => 'lon',
		'api_key' => 'aaaaa',
		'username' => 'aaaa'
	},
	'Linode' => {																				# ---------- Linode config - https://github.com/mitchellh/vagrant-linode
		'plan' => 'Nanode 1GB',																	# 	Server Size to use
		'distribution' => 'Debian 8',															# 	Operating system to run
		'datacenter' => 'singapore',															# 	Physical location of server
		'api_key' => 'aaaa'			# 	Linode account api_key
	}
}