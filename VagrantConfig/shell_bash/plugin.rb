require "vagrant"

module VagrantPlugins
  module ShellBash
    class Plugin < Vagrant.plugin("2")
      name "shell_bash"
      description <<-DESC
      Copy of shell provisioner, but calls "/bin/bash <script_name>" on provision instead of "<script_name>".
	  Works for machines that don't have executable file systems e.g. shared hosts.
      DESC

      config(:shell_bash, :provisioner) do
        require File.expand_path("../config", __FILE__)
        Config
      end

      provisioner(:shell_bash) do
        require File.expand_path("../provisioner", __FILE__)
        Provisioner
      end
    end
  end
end
