#------------------------------
#	Functions.rb
#
#	A set of functions for the Vagrant installation to use.
#------------------------------

# Args for Rsync to cloud servers
$rsync_args = ["--verbose","--recursive","--archive","--delete","--compress","--copy-links", "--update"]
$config_folder = File.dirname(__FILE__)

def run_command(cmd)
	puts "Running #{cmd}"
	return system(cmd);
end
def plugin_version(name)
	@vagrant_home ||= ENV['VAGRANT_HOME'] || File.join(ENV['USERPROFILE'] || ENV['HOME'],".vagrant.d")
	plugins = JSON.parse(File.read(File.join("#@vagrant_home","plugins.json")))
	return false if !plugins['installed']
	return false if !plugins['installed'][name]
	return false if !plugins['installed'][name]['gem_version']
	return plugins['installed'][name]['gem_version']
end
def plugin_dir(name)
	@vagrant_home ||= ENV['VAGRANT_HOME'] || File.join(ENV['USERPROFILE'] || ENV['HOME'],".vagrant.d")
	plugins = JSON.parse(File.read(File.join(@vagrant_home,"plugins.json")))
	return '' if !plugins['installed']
	return '' if !plugins['installed'][name]
	# C:\Users\jon\.vagrant.d\gems\2.2.5\gems\vagrant-linode-0.2.8
	return File.join(@vagrant_home,"gems","#{plugins['installed'][name]['ruby_version']}","gems","#{name}-#{plugins['installed'][name]['installed_gem_version']}")
end
def require_plugin(plugin_name,plugin_details)
	return 0 unless ARGV[0].match(/^status|reload|stop|halt|destroy|start|up|provision|ssh(-config)$/)
	return 0 if Vagrant.has_plugin?(plugin_name)
	abort(run_command("vagrant #{ARGV.join(' ')}")) if install_plugin(plugin_name, plugin_details) > 0
end
def install_plugin(plugin_name,plugin_details)
	plugin_details = {'version'=>nil} if !plugin_details
	has_plugin = Vagrant.has_plugin?(plugin_name)
	has_plugin_version = Vagrant.has_plugin?(plugin_name,plugin_details['version'])
	
	if has_plugin && !has_plugin_version
		# Bespoke version given; check for compatibility. If it isn't the right version, uninstall and drop through to install
		puts "#{plugin_name} is present, but is an invalid version."
		abort("Failed to uninstall #{plugin_name}") if run_command("vagrant plugin uninstall #{plugin_name}") == false
		has_plugin = false
	end
	if has_plugin == false
		cmd_version = ''
		cmd_source = ''
		cmd_version = "--plugin-version #{plugin_details['version']}" if plugin_details['version']
		cmd_source = plugin_name
		cmd_source = %Q("#{plugin_details['source']}") if plugin_details['source']
		abort("Failed to run #{cmd}") if run_command("vagrant plugin install #{cmd_source} #{cmd_version}") == false
		# After install, make sure that if a version was supplied, that it was ok
		# NOTE: At this stage, the vagrant's plugin manager is stale - read the plugins.json file directly.
		if plugin_details['version']
			plugin_json_version = plugin_version(plugin_name)
			abort("Failed to find plugin info for #{plugin_name} after installation!") if plugin_json_version == false
			abort("Plugin version for #{plugin_name} (#{version}) doesn't match expected version #{plugin_details['version']} after installation!") if plugin_json_version != plugin_details['version']
		end
		puts "Plugin #{plugin_name} automatically installed."
		return 1
	end
	return 0
end
def assert_provider(provider_name)

end
def uninstall_plugin(plugin_name)
	return 0 unless Vagrant.has_plugin?(plugin_name)
	run_command("vagrant plugin uninstall #{plugin_name}")
	return 1
end
def enforce_machine_name_requirement()
	if ARGV[0].match(/^reload|stop|halt|destroy|start|up|provision|ssh(-config)?$/)
		if !get_machine_name_from_command()
			puts " "
			puts "ERROR: When stopping/starting a server, please provide server name e.g. 'vagrant #{ARGV[0]} local' instead of 'vagrant #{ARGV[0]}'"
			exit
		end
	end
end
def get_provider_from_command()

end
def chef_deployment(machine,machine_name,machine_properties)
	chef_recipes =  machine_properties['chef_recipes'] || $Project['chef_recipes']
	cookbooks_path =  machine_properties['cookbooks_path'] || $Project['cookbooks_path'] || "#{machine_properties['server_config']['repository_code_folder']}/cookbooks"
	return false if !chef_recipes || !cookbooks_path

	server_config_json = Marshal::load(Marshal.dump(machine_properties['server_config']))
	server_config_json['hostname'] = machine.vm.hostname
	server_config_json['run_list'] = []
	Array(chef_recipes).join(' ').split(' ').each do |recipe|
		server_config_json['run_list'].unshift("recipe[#{recipe}]")
	end
	
	machine.vm.provision "shell" do |s|
		s.name = "Chef deployment"
		s.path = %Q(#{$config_folder}/chef_deploy.sh)
		s.args = [
			"#{machine_properties['server_config']['repository_code_folder']}/cookbooks",
			JSON.generate(server_config_json)
		]
	end
	return true
	machine.vm.provision :chef_solo do |chef|
		chef.json = machine_properties['server_config']
		chef.log_level = :info
		chef.cookbooks_path = Array(cookbooks_path)
		Array(chef_recipes).each do |recipe|
			chef.add_recipe recipe
		end
	end
	return true
end
def shell_script_deployment(machine,machine_name,machine_properties)
	deployment_script = machine_properties['deployment_script'] || $Project['deployment_script']
	return false if !deployment_script
	script_args='';
	if deployment_script.kind_of?(String)
		script_name = %Q("#{machine_properties['server_config']['repository_code_folder']}/#{deployment_script}")
		script_args = ''
	else
		script_name = %Q("#{machine_properties['server_config']['repository_code_folder']}/#{deployment_script['path']}")
		script_args = deployment_script['args'].map { |s| %Q("#{s}") }.join(' ') if deployment_script['args'];
	end
	machine.vm.provision "shell_bash", run: "always" do |s|
		s.name = "Deployment script #{script_name}"
		s.args = [ script_name, script_args ]
		s.privileged = false
		s.inline = <<-EOC
			HOME_DIR=$(printf ~);
			DEPLOYMENT_SCRIPT_LOCATION=$HOME_DIR/vagrant_deployment_script.sh;
			echo "/bin/bash $1 $2" > $DEPLOYMENT_SCRIPT_LOCATION;
			if [ -f "/etc/rc.local" ]; then
				grep -q -F "/bin/bash $DEPLOYMENT_SCRIPT_LOCATION" /etc/rc.local || $(
					cp /etc/rc.local /tmp/rc_local_tmp;
					sed -i "$ i\\/bin/bash $DEPLOYMENT_SCRIPT_LOCATION\\n" /tmp/rc_local_tmp;
					sudo cp -ura /tmp/rc_local_tmp /etc/rc.local && rm /tmp/rc_local_tmp
				);
				/bin/bash /etc/rc.local	
			else
				/bin/bash $DEPLOYMENT_SCRIPT_LOCATION
			fi
		EOC
	end	
end
def install_rsync_on_server()
	machine.vm.provision "shell_bash" do |s|
		s.name = "Checking server for Rsync binary"
		s.path = "#{$config_folder}/install_rsync_on_server.sh"
	end
end
def get_action_from_command()
	if ARGV[0] && ARGV[0].match(/^[a-zA-Z0-9]+$/)
		return ARGV[0]
	end
	return nil
end
def get_machine_name_from_command()
	if ARGV[1] && ARGV[1].match(/^[a-zA-Z0-9]+$/)
		return ARGV[1]
	end
	return nil
end
def local_machine_setup(machine, machine_name, machine_properties)
	machine_properties['is_local'] = 1
	machine_properties['is_cloud'] = 0
	machine_setup(machine, machine_name, machine_properties)
end
def cloud_machine_setup(machine, machine_name, machine_properties)
	machine_properties['is_local'] = 0
	machine_properties['is_cloud'] = 1
	machine_setup(machine, machine_name, machine_properties)
end
def machine_setup(machine, machine_name, machine_properties)
	$rsync_folder_excludes.each do |local_folder,server_folder|
		machine.vm.synced_folder "#{local_folder}", "#{server_folder}", disabled: true
	end
	machine_properties['server_config']['is_local'] = machine_properties['is_local']
	machine_properties['server_config']['is_cloud'] = machine_properties['is_cloud']
	
	
	code_to_provision = machine_properties['code_to_provision'] || 'local'
	branch = machine_properties['branch'] || 'master'	# If the machine definition has 'branch' attribute, pull from that branch.
	command_machine_name = get_machine_name_from_command()
	command_machine_action = get_action_from_command()
	
	return 0 if command_machine_name != machine_name
		
	if command_machine_name == machine_name		# Only run these runtime bits if we're actually running this server.
		if machine_properties['is_local'] != 1 && machine_properties['prompt_user_before_provision'] != 0	# ...if this server is NOT a local server (i.e. external/cloud hosted)...
			case command_machine_action	# ...display "Are you sure?" prompts to user when either deploying or destroying.
				when 'provision','up'
					abort unless system(%Q(sh "#{$config_folder}/provision_prompt.sh" "#{code_to_provision}" "#{$Project['repository']} (#{branch})"))
				when 'halt','stop','reload','destroy'
					abort unless system(%Q(sh "#{$config_folder}/halt_prompt.sh" "#{machine_name}"))
			end
		end
	end
	machine.ssh.insert_key = false
	# Set local properties for VirtualBox
	if machine_properties['is_local'] == 1
		if machine_properties['ip_address']
			machine.vm.network 'private_network', ip: "#{machine_properties['ip_address']}"
		end
		machine.vm.hostname = machine_properties['hostnames'][0].split(",")[0]
		if machine_properties['hostnames'].length > 1
			machine_properties['hostnames'].shift
		end
		machine.hostsupdater.remove_on_suspend = true
		machine.ssh.private_key_path = ["ssh/#{$Project['keypair_name']}", "~/.vagrant.d/insecure_private_key"]
		machine.vm.provision "file", source: "ssh/#{$Project['keypair_name']}.pub", destination: "~/.ssh/authorized_keys"
		machine.vm.provision "shell_bash" do |s|
			s.name = "Disable SSH access via Password (use key only!)"
			s.inline = <<-EOC
				sudo sed -i -e "\\#PasswordAuthentication yes# s#PasswordAuthentication yes#PasswordAuthentication no#g" /etc/ssh/sshd_config
				sudo service ssh restart
			EOC
		end
	end
	if code_to_provision == 'local'	# If provisioning code from the host (developer's) machine
		#machine.trigger.before :provision do |p|	# Make sure rsync is installed on guest.
		#	p.info = "Installing Rsync"
		#	p.run = {inline:%Q(sh "\"#{$config_folder}/VagrantConfig/install_rsync_on_server.sh\"" "#{machine_name}")}
		#end
		if machine_properties['is_local'] == 1
			machine.vm.synced_folder '.',"#{machine_properties['server_config']['repository_code_folder']}",
				mount_options: ["dmode=777,fmode=755"]
			#machine.vm.synced_folder '.',"#{machine_properties['server_config']['repository_code_folder']}", type: 'rsync',
			#	rsync__args: $rsync_args,
			#	rsync__exclude: [".git/","VagrantConfig/","Vagrantfile","ssh/","server_config.json"],
			#	rsync__auto: true,
			#	mount_options: ["dmode=775,fmode=755"],
			#	rsync__rsync_path: machine_properties['rsync_path'] || "sudo rsync"
		else
			machine.vm.synced_folder '.',"#{machine_properties['server_config']['repository_code_folder']}", type: 'rsync',
				rsync__args: $rsync_args,
				rsync__exclude: [".git/","VagrantConfig/","Vagrantfile","ssh/","client/","server_config.json"],
				rsync__auto: false,
				mount_options: ["dmode=775,fmode=755"],
				rsync__rsync_path: machine_properties['rsync_path'] || "rsync"
		end
	else 							# If provisioning code via the Git Repository...
		machine.vm.provision "file", source: "ssh", destination: "/tmp/ssh", run: "always"
		machine.vm.provision "shell_bash", run: "always" do |s|
			s.path = %Q(#{$config_folder}/provision_from_git.sh)
			s.name = "Provision from Git"
			s.args = "#{$Project['repository']} #{branch} /tmp/ssh/#{$Project['keypair_name']}.ppk #{machine_properties['server_config']['repository_code_folder']}"
			s.privileged = false
		end
	end
	machine.vm.provision "shell_bash", run: "always" do |s|	# Copy machine_properties to server_config.json
		server_config_json = Marshal::load(Marshal.dump(machine_properties['server_config']))
		server_config_json['hostname'] = machine.vm.hostname # machine_properties['hostnames']
		s.name = "Writing machine_properties to #{machine_properties['server_config']['repository_code_folder']}/server_config.json"
		s.inline = <<-EOC
			FN=$1
			JSON=$2
			echo $2 > $1
			chmod 755 $1
		EOC
		s.args = [ "#{machine_properties['server_config']['repository_code_folder']}/server_config.json", JSON.generate(server_config_json) ]
		s.privileged = false
	end
	shell_script_deployment(machine, machine_name, machine_properties) unless chef_deployment(machine, machine_name, machine_properties)			# Deployment via Chef if 'chef_recipes' is provided in server_config.
end

