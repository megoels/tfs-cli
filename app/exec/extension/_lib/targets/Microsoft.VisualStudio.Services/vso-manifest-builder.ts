import { ManifestBuilder } from "../../manifest"
import { LocalizedResources, PackageFiles } from "../../interfaces"
import _ = require("lodash");
import os = require("os");

import stream = require("stream");

export class VsoManifestBuilder extends ManifestBuilder {
	/**
	 * Gets the package path to this manifest.
	 */
	public getPath(): string {
		return "extension.vsomanifest";
	}

	public static manifestType = "Microsoft.VisualStudio.Services.Manifest";
	/**
	 * Explains the type of manifest builder
	 */
	public getType(): string {
		return VsoManifestBuilder.manifestType;
	}

	public getContentType(): string {
		return "application/json";
	}

	public finalize(files: PackageFiles, resourceData: LocalizedResources, builders: ManifestBuilder[]): Promise<void> {
		return super.finalize(files, resourceData, builders).then(() => {
			// Ensure some default values are set
			if (!this.data.contributions) {
				this.data.contributions = [];
			}
			if (!this.data.scopes) {
				this.data.scopes = [];
			}
			if (!this.data.contributionTypes) {
				this.data.contributionTypes = [];
			}
			if (!this.data.manifestVersion) {
				this.data.manifestVersion = 1;
			}
		});
	}

	/**
	 * Some elements of this file are arrays, which would typically produce a localization
	 * key like "contributions.3.name". We want to turn the 3 into the contribution id to
	 * make it more friendly to translators.
	 */
	public getLocKeyPath(path: string): string {
		let pathParts = path.split(".").filter(p => !!p);
		if (pathParts && pathParts.length >= 2) {
			let cIndex = parseInt(pathParts[1]);
			if (pathParts[0] === "contributions" && !isNaN(cIndex) && this.data.contributions[cIndex] && this.data.contributions[cIndex].id) {
				return _.trimEnd("contributions." + this.data.contributions[cIndex].id + "." + pathParts.slice(2).join("."));
			} else if (pathParts[0] === "contributionTypes" && !isNaN(cIndex) && this.data.contributionTypes[cIndex] && this.data.contributionTypes[cIndex].id) {
				return _.trimEnd("contributionTypes." + this.data.contributionTypes[cIndex].id + "." + pathParts.slice(2).join("."));
			} else {
				return path;
			}
		} else {
			return path;
		}
	}

	public processKey(key: string, value: any, override: boolean): void {
		switch (key.toLowerCase()) {
			case "eventcallbacks":
				if (_.isObject(value)) {
					this.singleValueProperty("eventCallbacks", value, key, override);
				}
				break;
			case "manifestversion":
				let version = value;
				if (_.isString(version)) {
					version = parseFloat(version);
				}
				this.singleValueProperty("manifestVersion", version, key, override);
				break;
			case "scopes":
				if (_.isArray(value)) {
					if (!this.data.scopes) {
						this.data.scopes = [];
					}
					this.data.scopes = _.uniq(this.data.scopes.concat(value));
				}
				break;
			case "baseuri":
				this.singleValueProperty("baseUri", value, key, override);
				break;
			case "contributions":
				if (_.isArray(value)) {
					if (!this.data.contributions) {
						this.data.contributions = [];
					}
					this.data.contributions = this.data.contributions.concat(value);
				} else {
					throw "\"contributions\" must be an array of Contribution objects.";
				}
				break;
			case "contributiontypes":
				if (_.isArray(value)) {
					if (!this.data.contributionTypes) {
						this.data.contributionTypes = [];
					}
					this.data.contributionTypes = this.data.contributionTypes.concat(value);
				}
				break;

			// Ignore all the vsixmanifest keys so we can take a default case below.
			case "namespace":
			case "extensionid":
			case "id":
			case "version":
			case "name":
			case "description":
			case "icons":
			case "screenshots":
			case "details":
			case "targets":
			case "links":
			case "branding":
			case "public":
			case "publisher":
			case "releasenotes":
			case "tags":
			case "flags":
			case "vsoflags":
			case "galleryflags":
			case "categories":
			case "files":
			case "githubflavoredmarkdown":
			case "showpricingcalculator":
				break;
			default:
				if (key.substr(0, 2) !== "__") {
					this.singleValueProperty(key, value, key, override);
				}
				break;
		}
	}
}