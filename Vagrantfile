ENV["VAGRANT_DISABLE_RESOLV_REPLACE"] = "1"
ENV["VAGRANT_DETECTED_OS"] = ENV["VAGRANT_DETECTED_OS"].to_s + " cygwin" if RUBY_PLATFORM.include? "mingw"		# Fix folder structure for Cygwin installations
ENV["VAGRANT_DEFAULT_PROVIDER"] = "virtualbox"		# Use VirtualBox by default.
ENV["VAGRANT_PREFER_SYSTEM_BIN"] = "0"				# Avoid conflicting versions of SSH with cygwin etc
ENV["VAGRANT_USE_VAGRANT_TRIGGERS"] = "1"			#

Vagrant.require_version ">= 2.1.0"	# 2.1.0 required for vagrant triggers.
$config_folder = "#{File.dirname(__FILE__)}/VagrantConfig"		# Folder where all required files are, escaping any spaces. Make sure this exists!!
$rsync_folder_excludes = {		# Any folders that you don't want to rsync to the server.
	"." => "/vagrant"
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

Ubuntu20_Official_amd64 = {
  'box_url' => 'https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64-vagrant.box',
  'box_name' => 'ubuntu-20.04_amd64_official'
}

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
Kamadan_Box = {
	'box_name' => 'kamadan-trade-server.box'
}
# Choose 1 of the above boxes for our local environment.
# Try swapping out for i386 version if your PC is a million years old and doesn't support VT-x.

# VirtualBox = 'Ubuntu20_Official_amd64'
VirtualBox = Kamadan_Box

# ------------------    Definitions		 ------------------
if File.file?("#{File.dirname(__FILE__)}/.env.rb") then
  require "#{File.dirname(__FILE__)}/.env.rb"
end

server_config = {
	'is_local'=>0,
	'is_production'=>0,
	'is_cloud'=>0,
	'is_aws'=>0,
	'is_google'=>0,
	'is_azure'=>0,
	'is_rackspace'=>0,
	'is_linode'=>0,
	'rsync'=>1,
	'deployment_date'=>Time.now.strftime("%Y%m%d%H%M%S"),
  'repository_code_folder'=>'/home/vagrant/kamadan-trade-chat',
  'db_user'=>'nodejs',
  'db_host'=>'127.0.0.1',
  'db_schema'=>'kamadan',
  #'disable_client'=>true,
  'db_pass'=>ENV["DB_PASS"] || 'K4maDan1423-zseq',
  'google_drive_backups_folder_id' => '1ZzNLnWUmj3SbyoI3zc2MJBjRifLWGzpP',
  'google_apis_private_key' => ENV["google_apis_private_key"],
  'google_apis_client_email' => ENV["google_apis_client_email"],
  'client_player_name'=>'Lorraine Logsalot'
}

$rsync_folder_excludes = $rsync_folder_excludes.merge({
    "node_modules"=>"#{server_config['repository_code_folder']}/node_modules"
})

local_config = Marshal::load(Marshal.dump(server_config))
local_config['is_local'] = 1

cloud_config = Marshal::load(Marshal.dump(server_config))
cloud_config['is_cloud'] = 1

production_config = Marshal::load(Marshal.dump(cloud_config))
production_config['is_production'] = 1

# ------------------ 	Vagrant Machine Definitions		 ------------------

Machines = {
'VirtualBox' => {},
	'Docker' => {
		'local' => {
			'hostnames' => ['local.kamadan.com'],	# With virtualbox, the first item is added to hosts file, then removed for further processing (see VagrantConfig/Functions.rb)
			'server_config' => local_config.merge({
        'disable_client'=>true
      }),
      			'ssh_username' => 'root',
      			#'ssh_password' => 'K4maDan1423-zseq',
      			'os' => 'linux',
			'ip_address' => '10.10.10.51',
      'deployment_script'=>{
        'path' => 'deploy.sh',
        'args' => [server_config['db_user'], server_config['db_pass'], server_config['db_schema']]
      },
			'code_to_provision' => 'local',
			'rsync'=>1
		}
	},
  'ManagedServers' => {
    'ramnode' => {
      'ip_address' => '107.191.98.41',
			'server_config' => cloud_config.merge({
				'repository_code_folder'=>'/home/ubuntu/kamadan-trade-chat',
        'is_cloud'=>1,
        'ssl_email'=>'jon@3vcloud.uk',
        'ssl_domains' => ['kamadan.gwtoolbox.com','ascalon.gwtoolbox.com']
			}),
			'code_to_provision' => 'local',
			#'rsync_path' => '~/local/bin/rsync',	# Custom rsync binary on server.
			'deployment_script'=>{
        'path' => 'deploy.sh',
        'args' => [server_config['db_user'], server_config['db_pass'], server_config['db_schema']]
      },
			'prompt_user_before_provision' => 0,
			'ssh_username' => 'root',
			'os' => 'linux'
    },
		'staging' => {
			'ip_address' => '54.75.106.111',
			'server_config' => cloud_config.merge({
				'repository_code_folder'=>'/home/ubuntu/kamadan-trade-chat',
        'is_cloud'=>1,
        'ssl_email'=>'jon@3vcloud.uk',
        'ssl_domains' => ['kamadan.gwtoolbox.com','ascalon.gwtoolbox.com']
			}),
			'code_to_provision' => 'local',
			#'rsync_path' => '~/local/bin/rsync',	# Custom rsync binary on server.
			'deployment_script'=>{
        'path' => 'deploy.sh',
        'args' => [server_config['db_user'], server_config['db_pass'], server_config['db_schema']]
      },
			'prompt_user_before_provision' => 0,
			'ssh_username' => 'ubuntu',
			'os' => 'linux'
		},
    'nano' => {
			'ip_address' => '63.35.250.60',
			'server_config' => cloud_config.merge({
				'repository_code_folder'=>'/home/ubuntu/kamadan-trade-chat',
        #'ssl_email'=>'jon@3vcloud.uk',
        #'ssl_domains' => ['kamadan.gwtoolbox.com','ascalon.gwtoolbox.com'],
        'is_cloud'=>1
			}),
			'code_to_provision' => 'local',
			#'rsync_path' => '~/local/bin/rsync',	# Custom rsync binary on server.
			'deployment_script'=>{
        'path' => 'deploy.sh',
        'args' => [server_config['db_user'], server_config['db_pass'], server_config['db_schema']]
      },
			'prompt_user_before_provision' => 0,
			'ssh_username' => 'ubuntu',
			'os' => 'linux'
		}
	}

}

Vagrant.configure("2") do |config|
    Machines['Docker'].each do |machine_name,machine_properties|
        config.vm.define machine_name do |machine|
            docker_machine_setup(machine,machine_name,machine_properties);
            machine.ssh.username = machine_properties['ssh_username'] || 'vagrant'
            if machine_properties['ssh_password']
                machine.ssh.password = machine_properties['ssh_password']
                machine.ssh.private_key_path = nil
            else
                machine.ssh.private_key_path = "ssh/#{$Project['keypair_name']}"
            end
            machine.ssh.sudo_command = "#{machine_properties['sudo_command'] || ''} %c"
            machine.ssh.insert_key = false
        end

        config.vm.provider "docker" do |d|
            d.image = "ubuntu-ssh"
            d.has_ssh = true
            d.ports = ['80:80','8306:3306']
        end

	end

	Machines['VirtualBox'].each do |machine_name,machine_properties|
		config.vm.define machine_name do |machine|
            machine.vm.box = VirtualBox['box_name']
            machine.vm.box_url = VirtualBox['box_url'] || nil
            config.vm.boot_timeout = 600
            machine.vbguest.auto_update = false
            virtualbox_machine_setup(machine,machine_name,machine_properties);
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