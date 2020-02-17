ENV["VAGRANT_DETECTED_OS"] = ENV["VAGRANT_DETECTED_OS"].to_s + " cygwin" if RUBY_PLATFORM.include? "mingw"		# Fix folder structure for Cygwin installations
ENV["VAGRANT_DEFAULT_PROVIDER"] = "virtualbox"		# Use VirtualBox by default.
ENV["VAGRANT_PREFER_SYSTEM_BIN"] = "0"				# Avoid conflicting versions of SSH with cygwin etc
ENV["VAGRANT_USE_VAGRANT_TRIGGERS"] = "1"			#
				
Vagrant.require_version ">= 2.1.0"	# 2.1.0 required for vagrant triggers.
$config_folder = "#{File.dirname(__FILE__)}/VagrantConfig"		# Folder where all required files are, escaping any spaces. Make sure this exists!!
$rsync_folder_excludes = {		# Any folders that you don't want to rsync to the server.
	"." => "/vagrant",
  "server/node_modules" => "/home/vagrant/kamadan-trade-chat/server/node_modules"
}

# ------------------	Vagrant Pre-Includes	------------------ #
# Functions and Project variables.
# ---------------------------------------------------------------- #
pre_includes = [
	"#{$config_folder}/Project.rb",		#	Identifiers for this project e.g. repo location, costcentre
	"#{$config_folder}/Functions.rb",	# 	Helper functions
	"#{$config_folder}/Plugins.rb"		#	Automatically installs plugins required for this vagrant installation.
]
pre_includes.each do |filename|
	require filename # unless not File.exists?(filename)
end

enforce_machine_name_requirement()

Ubuntu18_Official_amd64 = {
  'box_url' => 'https://cloud-images.ubuntu.com/bionic/20200206/bionic-server-cloudimg-amd64-vagrant.box',
  'box_name' => 'ubuntu-18.04_amd64_official'
}

Ubuntu_Official_i386 = {
	'box_url' => 'https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-i386-vagrant-disk1.box',
	'box_name' => 'ubuntu-14.04_i386_official'
}
Ubuntu_Official_amd64 = {
	'box_url' => 'https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box',
	'box_name' => 'ubuntu-14.04_amd64_official'
}
Debian8_Official_amd64 = {
	'box_url' => 'https://github.com/holms/vagrant-jessie-box/releases/download/Jessie-v0.1/Debian-jessie-amd64-netboot.box',
	'box_name' => 'debian-8_amd64_official'
}
# Choose 1 of the above boxes for our local environment. 
# Try swapping out for i386 version if your PC is a million years old and doesn't support VT-x.

VirtualBox = Ubuntu18_Official_amd64

# ------------------ 	Chef JSON Definitions		 ------------------
# Anything in the "environment_variables" array will be defined in /server/environment_variables.inc.php by Chef
# i.e. chef_json['environment_variables']['is_cloud'] = 1 would be defined as IS_CLOUD = '1' in PHP.
#
# The Eevee cookbook also references these variables to decide which recipes to run (e.g. if 'is_rackspace' == 1, runs eevee-server::eevee-rackspace)
#
# eevee-server::eevee-mysql will attempt to create/seed the schemas in the 'databases' array. 
# If 'host' == '127.0.0.1', eevee will create a new MySQL 5.6 server on the guest machine.

server_config = {
	'is_local'=>0,
	'is_production'=>0,
	'is_cloud'=>0,
	'is_aws'=>0,
	'is_google'=>0,
	'is_azure'=>0,
	'is_rackspace'=>0,
	'is_linode'=>0,
	'deployment_date'=>Time.now.strftime("%Y%m%d%H%M%S"),
  'repository_code_folder'=>'/home/vagrant/kamadan-trade-chat'
}

local_config = Marshal::load(Marshal.dump(server_config))
local_config['is_local'] = 1

cloud_config = Marshal::load(Marshal.dump(server_config))
cloud_config['is_cloud'] = 1

production_config = Marshal::load(Marshal.dump(cloud_config))
production_config['is_production'] = 1

# ------------------ 	Vagrant Machine Definitions		 ------------------

Machines = {
	'VirtualBox' => {
		'local' => {
			'hostnames' => ['local.kamadan.com'],	# With virtualbox, the first item is added to hosts file, then removed for further processing (see VagrantConfig/Functions.rb)
			'server_config' => local_config,
			'ip_address' => '10.10.10.51',
			'code_to_provision' => 'local'
		}
	}
}

Vagrant.configure("2") do |config|
	Machines['VirtualBox'].each do |machine_name,machine_properties|
		config.vm.define machine_name do |machine|
			machine.vm.box = VirtualBox['box_name']
			machine.vm.box_url = VirtualBox['box_url'] || nil
			local_machine_setup(machine,machine_name,machine_properties);
		end
		config.vm.provider :virtualbox do |v, override|
			#v.gui=true
			v.customize ['modifyvm', :id, '--memory', machine_properties['server_memory_size'] || VirtualBox['server_memory_size'] || '1024']
			v.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
		end
	end
end

# ------------------	Vagrant Post-Includes	------------------ #
# Provider specific details and VM provider setups.
# ---------------------------------------------------------------- #
post_includes = [
	"#{$config_folder}/CloudProviderSetup.rb"
]
post_includes.each do |filename|
	require filename # unless not File.exists?(filename)
end