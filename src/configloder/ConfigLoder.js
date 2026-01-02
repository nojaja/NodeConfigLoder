import * as path from 'path'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();

export class ConfigLoder {
    constructor(debug) {
        this.debug = debug || false;
    }

    readListSync(filepath) {
        try {
            if (!fs.existsSync(filepath)) {
                throw new Error(`no such list file: ${filepath}`, filepath);
            }
            const data = fs.readFileSync(filepath, 'utf8');
            return data.split(/\r?\n/);
        } catch (error) {
            throw new Error(`read error: ${filepath}`, error);
        }
    }

    readConfigSync(filepath) {
        try {
            if (!fs.existsSync(filepath)) {
                throw new Error(`no such list file: ${filepath}`, filepath);
            }
            const content = fs.readFileSync(filepath, 'utf8');
            const ext = path.extname(filepath);
            return (ext == '.yaml' || ext == '.yml') ? JSON.stringify(yaml.load(content)) : content;
        } catch (error) {
            throw new Error(`readConfigSync error: ${error}`, error);
        }
    }

    toYamlText(json) {
        return yaml.dump(JSON.parse(JSON.stringify(json)));
    }

    toJsonText(json) {
        return JSON.stringify(json, null, 2);
    }

    writeConfigSync(filepath, data) {
        try {
            const ext = path.extname(filepath);
            if (ext == '.yaml' || ext == '.yml') {
                fs.writeFileSync(filepath, this.toYamlText(data));
            } else {
                fs.writeFileSync(filepath, this.toJsonText(data));
            }
        } catch (error) {
            throw new Error(`writeConfigSync error: ${error}`, error);
        }
    }
}

export default ConfigLoder