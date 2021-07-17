const path = require('path');
const fs = require('fs');
const filepath = require('filepath');
const terser = require('terser');
const sass = require('sass');
const postcss = require('postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');

const srcFolder = 'src';
const distFolder = 'dist';

const name = 'frost-ui-tables';

// create dist folder if it doesn't exist
if (!fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder);
}

// load files and wrapper
let wrapper;
const files = [];

filepath.create(srcFolder).recurse(fullPath => {
    if (!fullPath.isFile()) {
        return;
    }

    if (path.extname(fullPath.path) === '.js') {
        const fileName = path.basename(fullPath.path, '.js');
        const data = fs.readFileSync(fullPath.path, 'utf8');

        if (fileName === 'wrapper') {
            wrapper = data;
        } else {
            files.push(data);
        }
    }
});

// inject code to wrapper
const code = wrapper.replace(
    '    // {{code}}',
    files.join('\r\n\r\n')
        .replace(
            /^(?!\s*$)/mg,
            ' '.repeat(4)
        )
);

// minify
terser.minify(code, {
    ecma: 8,
    compress: {
        ecma: 8
    }
}).then(minified => {
    fs.writeFileSync(
        path.join(distFolder, name + '.js'),
        code
    );

    fs.writeFileSync(
        path.join(distFolder, name + '.min.js'),
        minified.code
    );
}).catch(error => {
    console.error(error);
});

// css
sass.render({
    file: path.join(srcFolder, 'scss/table.scss'),
    includePaths: [path.join(srcFolder, 'scss/')],
    outputStyle: 'expanded'
}, (error, result) => {
    if (error) {
        console.error(error);
        return;
    }

    const fullPath = path.join(distFolder, name + '.css');
    const minifiedPath = path.join(distFolder, name + '.min.css');

    postcss([autoprefixer])
        .process(result.css.toString(), { from: fullPath })
        .then(processed => {
            fs.writeFileSync(
                fullPath,
                processed.toString()
            );

            return postcss([cssnano])
                .process(processed.toString(), { from: fullPath, to: minifiedPath });
        })
        .then(minified => {
            fs.writeFileSync(
                minifiedPath,
                minified.toString()
            );
        });
});