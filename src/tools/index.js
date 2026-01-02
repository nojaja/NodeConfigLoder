import * as path from 'path'
import * as fs from 'fs'
import Configloder from '../configloder/ConfigLoder'
import Serializer from '../configloder/Serializer'
import { Command } from 'commander';
import PathUtil from '@nojaja/pathutil'
import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();

/*初期値設定 */
const SettingsPath = path.join(__dirname, 'dist', 'Settings.json');


/*起動パラメータ設定 */
const version = (typeof __VERSION__) !== 'undefined' ? __VERSION__ : 'dev'; //__VERSION__はビルド時にwebpackのDefinePluginによって書き換えられます。
const program = new Command();
program.version(version);
program
    .requiredOption('-i, --input <type>', 'input config source file path')
    .option('-o, --output <type>', 'output config file path')
    .option('-k, --cryptokey <type>', 'crypto key')
    .option('-d --debug', 'output extra debugging log')

program.parse(process.argv);
const options = program.opts();
if (options.debug) console.log(options)

//入力先の絶対パス取得
const inputPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(options.input));
const outputPath = PathUtil.normalizeSeparator(PathUtil.absolutePath((options.output) ? options.output : './'));

if (options.input) console.log(`inputPath: ${inputPath}`);
if (options.output) console.log(`outputPath: ${outputPath}`);

const main = async () => {
    const startTime = process.hrtime();
    process.on('exit', exitCode => {
        //後始末処理
        const endTimeArray = process.hrtime(startTime);
        const memoryUsage = process.memoryUsage();
        function toMByte(byte) {
            return `${Math.floor((byte / 1024 / 1024) * 100) / 100}MB`
        }
        const _memoryUsage = JSON.stringify({
            "rss": toMByte(memoryUsage.rss),
            "heapTotal": toMByte(memoryUsage.heapTotal),
            "heapUsed": toMByte(memoryUsage.heapUsed),
            "external": toMByte(memoryUsage.external),
            "arrayBuffers": toMByte(memoryUsage.arrayBuffers)
        });
        console.log(`process statistics - Execution time: ${endTimeArray[0]}s ${endTimeArray[1] / 1000000}ms, memoryUsage: ${_memoryUsage}`);
    });
    try {
        //設定ファイルの読み込み
        const config = fs.readFileSync(inputPath, 'utf8');
        const cryptokey = (options.cryptokey) ? Buffer.from(options.cryptokey, 'hex') : Serializer.generatekey();
        if (!options.cryptokey) console.log(`cryptokey: ${cryptokey.toString('hex')}`);
        
        
        const configloder = new Configloder();
        const serializer = new Serializer(cryptokey);
        const settingsdata = serializer.serializeObject(config);

        //出力先フォルダの作成
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        configloder.writeConfigSync(outputPath, settingsdata);
        const contents = configloder.readConfigSync(outputPath);
        const obj = serializer.deserializeObject(contents)
        console.log(obj);

    } catch (error) {
        console.error(`fatal: ${error}`);
        process.exitCode = 1;
        return;
    }
};

await main();