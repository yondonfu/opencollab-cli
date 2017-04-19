import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { spawn } from 'child_process';

export default class IssueEditor {
  constructor(editor) {
    this.editor = editor || process.env.EDITOR || 'vi';
  }

  ensureDir(file) {
    return new Promise((resolve, reject) => {
      mkdirp(path.dirname(file), err => {
        if (err) {
          reject(err);
        } else {
          resolve(file);
        }
      });
    });
  }

  writeFile(file, content = '') {
    const id = path.basename(file, '.txt');

    if (!content) {
      content = 'Issue #' + id + '\n\n';
    }

    return new Promise((resolve, reject) => {
      fs.writeFile(file, content, err => {
        if (err) {
          reject(err);
        } else {
          resolve(file);
        }
      });
    });
  }

  deleteFile(file) {
    return new Promise((resolve, reject) => {
      fs.unlink(file, err => {
        if (err) {
          reject(err);
        } else {
          resolve(file);
        }
      });
    });
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err, content) => {
        if (err) {
          reject(err);
        } else {
          resolve({file, content});
        }
      });
    });
  }

  editFile(file) {
    return new Promise((resolve, reject) => {
      spawn(this.editor, [file], {
        stdio: 'inherit'
      }).on('exit', code => {
        if (code !== 0) {
          reject(new Error(`${this.editor} had a non zero exit code: ${code}`));
        } else {
          resolve(file);
        }
      });
    });
  }

  edit(file, content = '') {
    return this.ensureDir(file)
      .then(file => this.writeFile(file, content))
      .then(file => this.editFile(file))
      .then(file => this.readFile(file))
      .then(({file, content}) => this.deleteFile(file).then(() => content));
  }
}
