const fs = require('fs');
const Axios = require('axios');
const chalk = require('chalk');
const path = require('path');
const http = require('http');
const os = require('os');
const cp = require('child_process');
const yargs = require('yargs');
const prompt = require('prompt-sync')();

const APP_NAME = 'react-sandbox';

const FILES = [
  'package.json',
  '.eslintignore',
  'public/index.html',
  'src',
];

const BINARY_EXT = [
  'png',
  'jpg',
  'jpeg'
];

function bufferToBase64DataUrl(buffer, mimeType) {
  return 'data:' + mimeType + ';base64,' + buffer.toString('base64');
}

function execGitCommand(context, cmd) {
  return cp.execSync(cmd, { cwd: context.fabricPath }).toString()
    .replace(/\n/g, ',')
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

function getGitInfo(context) {
  const branch = execGitCommand(context, 'git branch --show-current')[0];
  const tag = execGitCommand(context, 'git describe --tags')[0];
  const changes = execGitCommand(context, 'git status --porcelain').map(value => {
    const [type, path] = value.split(' ');
    return { type, path };
  });
  const userName = execGitCommand(context, 'git config user.name')[0];
  return {
    branch,
    tag,
    changes,
    user: userName
  }
}

/**
 * writes the diff files to the app for version control
 */
function writeDiff(context) {
  const diffFolder = path.resolve(context.appPath, 'src', 'diff');
  const diffPath = path.resolve(diffFolder, 'upstream.diff');
  const stagingDiffPath = path.resolve(diffFolder, 'staging.diff');
  if (!fs.existsSync(path.resolve(diffFolder))) {
    fs.mkdirSync(diffFolder);
  }
  console.log(`> writing diff files`);
  cp.execSync(`git diff upstream/master > ${diffPath}`, { cwd: context.fabricPath });
  cp.execSync(`git diff > ${stagingDiffPath}`, { cwd: context.fabricPath });
}

function buildDist(context) {
  cp.execSync('node build.js modules=ALL requirejs fast', { cwd: context.fabricPath });
}

function copyBuildToApp(context) {
  const fabricSource = path.resolve(context.fabricPath, 'dist', 'fabric.js');
  const fabricDest = path.resolve(context.appPath, 'src', 'fabric', 'build.js');
  console.log(`> building dist`);
  buildDist(context);
  let content = fs.readFileSync(fabricSource).toString();
  const gitInfo = getGitInfo(context);
  content += `\n// fabric react sandbox`;
  content += `\n// last git tag ${gitInfo.tag}`;
  content += `\nfabric.version='#${gitInfo.tag}';\n`;
  fs.writeFileSync(fabricDest, content);
  console.log(`> generated ${fabricDest}`);
}

function validateFabricPath(fabricPath) {
  const packagePath = path.resolve(fabricPath, 'package.json');
  if (fabricPath && fs.existsSync(fabricPath) && fs.existsSync(packagePath)) {
    const packageJSON = require(packagePath);
    return packageJSON.name === 'fabric';
  }
  return false;
}

function promptFabricPath() {
  const fabricPath = prompt('enter the path pointing to fabric folder: ');
  if (!validateFabricPath(fabricPath)) {
    console.log(`couldn't find fabric at given path: ${fabricPath}`);
    return promptFabricPath();
  }
  console.log(`fabric has been found, thanks!`);
  return fabricPath;
}

function createReactAppIfNeeded(context, start = false) {
  const { template, appPath } = context;
  if (!fs.existsSync(appPath)) {
    const templateDir = process.cwd();
    console.log(chalk.blue(`> creating sandbox using cra-template-${template}`));
    template === 'js' && console.log(chalk.yellow(`> if you want to use typescript re-run with --typescript flag`));
    cp.execSync(`npx create-react-app ${appPath} --template file:${path.resolve(templateDir, template)}`, {
      stdio: 'inherit'
    });
    start && startReactSandbox(context);
  } else {
    console.log(chalk.yellow(`> the path ${appPath} already exists`));
    process.exit(1);
  }
}

async function startReactSandbox(context) {
  const { appPath, fabricPath } = context;
  copyBuildToApp(context);
  writeDiff(context);
  console.log(chalk.yellow(`\n> watching for changes in fabric ${fabricPath}`));
  fs.watch(path.resolve(fabricPath, 'src'), { recursive: true }, () => {
    try {
      copyBuildToApp(context);
      writeDiff(context);
    } catch (error) {
      console.log(chalk.blue('> error listening to/building fabric'));
    }
  });
  const port = await createServer(context, 5000);
  const packagePath = path.resolve(appPath, 'package.json');
  const package = JSON.parse(fs.readFileSync(packagePath).toString());
  package.proxy = `http://localhost:${port}`;
  fs.writeFileSync(packagePath, JSON.stringify(package, null, '\t'));
  try {
    cp.spawn('npm', ['run', 'app'], { shell: true, cwd: appPath, stdio: 'inherit' });
  } catch (error) {
    console.log(chalk.yellow('\n> stopped watching for changes in fabric'));
    process.exit(1);
  }
}

function createDeployedEnv(context) {
  let env = fs.readFileSync(path.resolve(context.appPath, '.env')).toString();
  env += '\nREACT_APP_SANDBOX_DEPLOYED=true\n';
  return env;
}

/**
 * https://codesandbox.io/docs/api/#define-api
 */
async function createCodeSandbox(context) {
  const { appPath } = context;
  copyBuildToApp(context);
  writeDiff(context);
  const files = {
    '.env': { content: createDeployedEnv(context) },
    'src/git.json': { content: getGitInfo(context) }
  };
  const processFile = (fileName) => {
    const filePath = path.resolve(appPath, fileName);
    const ext = path.extname(fileName).slice(1);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.readdirSync(filePath)
        .forEach(file => {
          processFile(path.join(fileName, file).replace(/\\/g, '/'));
        });
    } else if (BINARY_EXT.some(x => x === ext)) {
      files[fileName] = {
        content: bufferToBase64DataUrl(fs.readFileSync(filePath), `image/${ext}`),
        isBinary: true
      };
    } else {
      files[fileName] = { content: fs.readFileSync(filePath).toString() };
    }
  }
  FILES.forEach(processFile);
  // add diff files to public diretory so we can download them drom the app
  const diffFolderName = 'src/diff';
  fs.readdirSync(path.resolve(appPath, diffFolderName))
    .forEach(file => {
      const fileName = path.join('public', 'diff', file).replace(/\\/g, '/');
      const filePath = path.resolve(appPath, diffFolderName, file);
      files[fileName] = { content: fs.readFileSync(filePath).toString() };
    });

  const isTypescript = fs.existsSync(path.resolve(appPath, 'src', 'App.tsx'));
  try {
    const { data: { sandbox_id } } = await Axios.post("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
      template: isTypescript ? 'create-react-app-typescript' : 'create-react-app',
      files
    });
    const uri = `https://codesandbox.io/s/${sandbox_id}`;
    console.log(chalk.yellow(`created code sandbox ${uri}`));
    return uri;
  } catch (error) {
    throw error.toJSON();
  }
}

async function createAndOpenCodeSandbox(context) {
  const uri = await createCodeSandbox(context);
  runApplication(uri);
}

function runApplication(cmd) {
  cp.execSync(`${os.platform().startsWith('win') ? 'start' : 'open'} ${cmd}`);
}

/**
 * 
 * @param {number} [port]
 * @returns {Promise<number>} port
 */
function createServer(context, port = 5000) {
  const { appPath } = context;
  const server = http.createServer(async (req, res) => {
    switch (req.url) {
      case '/codesandbox':
        try {
          const uri = await createCodeSandbox(context);
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({ uri }, null, '\t'));
        } catch (error) {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({ error }, null, '\t'));
        }
        break;
      case '/git':
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(getGitInfo(context), null, '\t'));
        break;
      case '/open-ide':
        let appFile = path.resolve(appPath, 'src', 'App.tsx');
        if (!fs.existsSync(appFile)) {
          appFile = path.resolve(appPath, 'src', 'App.js');
        }
        if (fs.existsSync(appFile)) {
          runApplication(appFile);
        }
        res.writeHead(200);
        res.end();
        break;
      default:
        res.writeHead(400, {
          'Content-Type': 'text/plain'
        });
        res.end(`unknown endpoint ${req.url}`);
        break;
    }
  });

  return new Promise((resolve, reject) => {
    const initialPort = port;
    const listen = () => {
      server.listen(port)
        .on('listening', () => {
          resolve(port);
        })
        .on('error', (error) => {
          server.close();
          if (error.code === 'EADDRINUSE' && port - initialPort < 100) {
            port++;
            listen();
          } else {
            console.error(error);
            reject(error);
            process.exit(1);
          }
        });
    };
    listen();
  }).then(port => {
    console.log(chalk.yellow(`> sandbox server is listening on port ${port}`));
    return port;
  });
}

function runInContext(cb, argv) {
  const package = require('./package.json');
  const context = {
    appPath: process.cwd(),
    fabricPath: package.sandboxConfig.fabric,
    template: package.sandboxConfig.template
  }
  if (!validateFabricPath(context.fabricPath)) {
    console.log('this app relies on fabric to function');
    context.fabricPath && console.log(`couldn't find fabric at given path: ${context.fabricPath}`);
    const validPath = promptFabricPath();
    context.fabricPath = validPath;
    package.sandboxConfig = { fabric: validPath, template: context.template };
    fs.writeFileSync(path.resolve(process.cwd(), 'package.json'), JSON.stringify(package, null, '\t'));
  }
  Object.freeze(context);
  cb(context);
}

yargs
  .scriptName('fabric.js react sandbox')
  .usage('$0 <cmd> [args]')
  .command('build [appPath] [typescript] [start]',
    'build the sandbox',
    yargs => {
      yargs.positional('appPath', {
        type: 'string',
        describe: 'the path where you want the sandbox to be created at',
        default: `./${APP_NAME}`,
      });
      yargs.positional('typescript', {
        type: 'boolean',
        describe: 'build the sandbox with typescript',
        default: false
      });
      yargs.positional('start', {
        type: 'boolean',
        describe: 'start the sandbox after building has completed',
        default: false
      });
    },
    argv => {
      const context = {
        appPath: path.resolve(process.cwd(), argv.appPath),
        template: argv.typescript ? 'ts' : 'js',
      }
      Object.freeze(context);
      createReactAppIfNeeded(context, argv.start);
    }
  )
  .command('start', 'start the sandbox', applyCommonPositionals, runInContext.bind(undefined, startReactSandbox))
  .command('deploy', 'deploy to codesandbox.io', applyCommonPositionals, runInContext.bind(undefined, createAndOpenCodeSandbox))
  .command('serve', 'start the sandbox server', applyCommonPositionals, runInContext.bind(undefined, async context => {
    const port = await createServer(context);
    runApplication(`http://localhost:${port}`);
  })
  )
  .help()
  .argv;