import { TfCommand, CoreArguments } from "../lib/tfcommand";
import { DiskCache } from "../lib/diskcache";
import { getCredentialStore } from "../lib/credstore";
import colors = require("colors");
import os = require('os');
import trace = require('../lib/trace');
import Q = require('q');

export function getCommand(args: string[]): Login {
	// this just offers description for help and to offer sub commands
	return new Login(args);
}

export interface LoginResult {
	success: boolean;
}

/**
 * Facilitates a "log in" to a service by caching credentials.
 */
export class Login extends TfCommand<CoreArguments, LoginResult> {
	protected description = "Login and cache credentials using a PAT or basic auth.";
	protected serverCommand = true;
	
	public exec(): Promise<LoginResult> {
		trace.debug('Login.exec');
		let authHandler;
		return this.commandArgs.serviceUrl.val().then((collectionUrl) => {
			return this.getCredentials(collectionUrl, false).then((handler) => {
				authHandler = handler;
				return this.getWebApi();
			}).then((webApi) => {
				let agentApi = webApi.getTaskAgentApi();
				return Q.Promise<LoginResult>((resolve, reject) => {

					return agentApi.connect().then((obj) => {
						let tfxCredStore = getCredentialStore("tfx");
						let tfxCache = new DiskCache("tfx");
						let credString;
						if (authHandler.username === "OAuth") {
							credString = "pat:" + authHandler.password;
						} else {
							credString = "basic:" + authHandler.username + ":" + authHandler.password;
						}
						trace.info(colors.green("Logged in successfully"));
						return tfxCredStore.storeCredential(collectionUrl, "allusers", credString).then(() => {
							return tfxCache.setItem("cache", "connection", collectionUrl);
						});
					}).catch((err) => {
						if (err && err.statusCode && err.statusCode === 401) {
							trace.error("Connection failed: invalid credentials.");
							throw "Invalid credentials.";
						} else if (err) {
							trace.error("Connection failed.");
							throw "Connection failed. Check your internet connection & collection URL." + os.EOL + "Message: " + err.message;
						}
					});
				});
			});
		});
	}

	public friendlyOutput(data: LoginResult): void {
		if (data.success) {
			trace.info(colors.green("Logged in successfully"));
		} else {
			trace.error("login unsuccessful.");
		}
	}
}