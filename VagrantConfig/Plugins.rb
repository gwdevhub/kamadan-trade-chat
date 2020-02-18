#--------------------------------------
#	Plugins.rb
#
#	Automatically installs plugins required for this vagrant installation.
#	Called from Vagrantfile - not meant to be standalone script.
#--------------------------------------
config_folder = File.dirname(__FILE__)

require "#{config_folder}/Functions.rb"

plugins_installed = 0
plugins_uninstalled = 0
# Required plugins (false = no special version/source, but still install!)
required_plugins = {
	#'vagrant-omnibus'=>false,
	#'vagrant-triggers'=>false,
	#'vagrant-hostsupdater'=>false,
	#'vagrant-aws'=>false,
	#'vagrant-rackspace'=>false,
	#'vagrant-google'=>false,
	#'vagrant-linode'=>false
	#'vagrant-azure'=>false
}
plugins_installed=0
required_plugins.each do |plugin_name,plugin|
	require_plugin(plugin_name,plugin)
end
require "#{config_folder}/shell_bash/plugin.rb"