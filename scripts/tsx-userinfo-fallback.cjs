const os = require('node:os');

const originalUserInfo = os.userInfo.bind(os);
os.userInfo = (...args) => {
  try {
    return originalUserInfo(...args);
  } catch (error) {
    if (error?.syscall !== 'uv_os_get_passwd') throw error;

    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || 'hadirr',
      homedir: process.env.USERPROFILE || os.tmpdir(),
      shell: process.env.ComSpec || ''
    };
  }
};
