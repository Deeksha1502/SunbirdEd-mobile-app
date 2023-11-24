const path = require('path');
const fs = require('fs-extra');

function copyFromNodeModule(src, dist) {
    try {
        const files = fs.readdirSync(src);

        files.forEach(function (file) {
            if (!(['node_modules', 'preview.html', 'README.md', 'chunks', 'preview_cdn.html', 'package.json'].includes(file))) {
                fs.copySync(path.join(src, file), path.join(dist, file));
            }
        });
    } catch (e) {
        console.error(e);
    }

}

function copyFromContentPlayer(src, dist) {
    try {
        console.log('copy sync form content player');
        fs.copySync(src, dist);
    } catch (e) {
        console.log('error on copy form content player');
        console.error(e);
    }

}
// module.exports = function (context) {
    var srcPath;
    var destinationPath;
    var destinationPath1;
    console.log('***** copy content');
    srcPath = path.join(__dirname, '../content-player');
    destinationPath = path.join(__dirname, '../www/content-player');
    destinationPath1 = path.join(__dirname, '../dist/content-player');
    copyFromContentPlayer(srcPath, destinationPath);
    copyFromContentPlayer(srcPath, destinationPath1);
    console.log('copied from content-player to www/content-player');

    srcPath = path.join(__dirname, '../node_modules/@project-sunbird/content-player');
    destinationPath = path.join(__dirname, '../www/content-player');
    destinationPath1 = path.join(__dirname, '../dist/content-player');
    copyFromNodeModule(srcPath, destinationPath);
    copyFromNodeModule(srcPath, destinationPath1);
    console.log('copied from node_modules/content-player to wwww/content-player');
// }





