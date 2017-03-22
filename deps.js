#!/usr/bin/env node

const request = require('request');

const DEPENDENCIES = {
  javascript: {
    repo: 'javascript-kit',
    projects: {
      'prismic-nodejs': {
        'nodejs-sdk': {},
      },
      'prismic-cli': {},
      'reactjs-starter': {},
    },
  },
  php: {
    repo: 'php-kit',
    projects: {
      'php-plain-starter': {},
      SymfonyBundle: {
        'php-symfony-starter': {},
      },
      'php-quickstart': {},
      'php-website': {},
      'php-blog': {},
      'php-laravel-starter': {},
    },
  },
};

function sequence(array, f, callback) {
  const step = (aaa, xxx) => {
    if (aaa.length === 0) {
      callback(xxx);
    } else {
      const a = aaa[0];
      f(a, (x) => {
        step(aaa.slice(1), xxx.concat([x]));
      });
    }
  };
  step(array, []);
}

function fetch(url, callback) {
  request({
    url,
    headers: {
      'User-Agent': 'srenault',
    },
  }, (error, response, body) => {
    if (callback) callback(JSON.parse(body));
  });
}

function fetchDependenciesFile(repo, file, callback) {
  const url = `https://raw.githubusercontent.com/prismicio/${repo}/master/${file}`;
  fetch(url, callback);
}

function fetchJsDependencyVersion(repo, field, callback) {
  fetchDependenciesFile(repo, 'package.json', (json) => {
    if (callback) {
      const projectVersion = json.version;
      const version = json.dependencies[field];
      callback(projectVersion, json.name, version);
    }
  });
}

function fetchTags(repo, callback) {
  fetch(`https://api.github.com/repos/prismicio/${repo}/tags`, callback);
}

function fetchPhpKitVersion(repo, callback) {
  fetchDependenciesFile(repo, 'composer.json', (json) => {
    fetchTags(repo, (tags) => {
      if (callback) {
        if (callback) {
          callback({
            version: tags.length > 0 ? tags[0].name : null,
            name: json.name,
          });
        }
      }
    });
  });
}

function fetchPhpVersion(repo, callback) {
  fetchTags(repo, (tags) => {
    if (callback) {
      callback(tags.length > 0 ? tags[0].name : null);
    }
  });
}

function fetchPhpDependencyVersion(repo, field, callback) {
  fetchPhpVersion(repo, (projectVersion) => {
    fetchDependenciesFile(repo, 'composer.json', (json) => {
      if (callback) {
        const version = json.require[field];
        callback(projectVersion, json.name, version);
      }
    });
  });
}

function fetchJsKitVersion(repo, callback) {
  fetchDependenciesFile(repo, 'package.json', (json) => {
    if (callback) {
      callback({
        version: json.version,
        name: json.name,
      });
    }
  });
}

const FETCH_KIT = {
  javascript: fetchJsKitVersion,
  php: fetchPhpKitVersion,
};

const FETCH_DEPENDENCY = {
  javascript: fetchJsDependencyVersion,
  php: fetchPhpDependencyVersion,
};

function check(kit, dependency, tree, callback) {
  const projects = Object.keys(tree || {});
  if (projects.length === 0) {
    if (callback) callback([]);
  } else {
    sequence(projects, (project, cb) => {
      FETCH_DEPENDENCY[kit](project, dependency.name, (projectVersion, projectName, version) => {
        const p = {
          name: project,
          dependency: dependency.name,
          expected: dependency.version,
          is: version,
        };

        check(kit, { name: projectName, version: projectVersion }, tree[project], (innerResult) => {
          if (cb) cb([p].concat(innerResult));
        });
      });
    }, (result) => {
      if (callback) {
        callback(result.reduce((acc, a) => {
          return acc.concat(a);
        }, []));
      }
    });
  }
}

function run(tree, callback) {
  const kits = Object.keys(tree);
  sequence(kits, (repoKit, cb) => {
    const kitTree = tree[repoKit];
    FETCH_KIT[repoKit](kitTree.repo, (kit) => {
      check(repoKit, { name: kit.name, version: kit.version }, kitTree.projects, cb);
    });
  }, (res) => {
    if (callback) {
      const x = kits.reduce((acc, kit, index) => {
        acc[kit] = res[index];
        return acc;
      }, {});
      callback(x);
    }
  });
}

module.exports = {
  check(cb) {
    run(DEPENDENCIES, cb);
  },
};
