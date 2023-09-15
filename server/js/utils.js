import {exec, spawn} from "child_process";

/**
 * Run cli command
 * @param cmd {string|string[]} Command to run
 * @param log_output {boolean} Log output to console as it happens
 * @param throw_on_fail {boolean} Throw exception on failure, or just reject with a code
 * @returns {Promise<unknown>}
 */
export async function cmd(cmd, log_output = true, throw_on_fail = true) {
  return new Promise((resolve, reject) => {
    let stdout_buf = '', stderr_buf='', options = {};
    let first_arg = cmd;
    if(typeof cmd == 'string') {
      options.shell = true;
      cmd = [];
    } else {
      first_arg = cmd.shift();
    }
    let spawn_args = [first_arg,cmd,options];
    console.log(' >>> '+([first_arg].concat(cmd).join(' ')));
    let proc    = spawn.apply(exec,spawn_args);
    proc.stdout.on('data', function (data) {
      if(log_output) console.log(' <<< ' +data.toString());
      stdout_buf += data.toString();
    });

    proc.stderr.on('data', function (data) {
      if(log_output) console.log(' <<< '+data.toString());
      stdout_buf += data.toString();
    });
    if(throw_on_fail)
      proc.on('error', reject);
    proc.on('exit', function (code) {
      if(code !== 0 && throw_on_fail) {
        console.log(' <<< '+stdout_buf);
        return reject(code);
      }
      return resolve(stdout_buf);
    });
  });
}

/**
 * Use instead of setTimeout
 * @param ms {number} Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Easily convert anything to a number, throws on exception
 * @param arg {any}
 * @returns {number}
 */
export function toNumber(arg = 0) {
  let cpy = arg;
  if(typeof cpy !== 'number')
    cpy = parseInt(cpy,10);
  if(isNaN(cpy))
    throw new Error(`Failed to convert toNumber: ${arg}`);
  return cpy;
}

/**
 * JSON.stringify, handling bigints
 * @param obj {any}
 * @returns {string}
 */
export function stringify(obj) {
  return JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint'
          ? value.toString()
          : value // return everything else unchanged
  );
}