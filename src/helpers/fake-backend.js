import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
const mock = new MockAdapter(axios);
export const fakeUsers = [{
  id: '1',
  email: 'user@demo.com',
  username: 'demo_user',
  password: '123456',
  firstName: 'Demo',
  lastName: 'User',
  role: 'User',
  token: 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJDb2RlcnRoZW1lcyIsImF1ZCI6Imh0dHBzOi8vY29kZXJ0aGVtZXMuY29tLyIsInN1YiI6InN1cHBvcnRAY29kZXJ0aGVtZXMuY29tIiwibGFzdE5hbWUiOiJDb2RlcnRoZW1lcyIsIkVtYWlsIjoic3VwcG9ydEBjb2RlcnRoZW1lcy5jb20iLCJSb2xlIjoiQWRtaW4iLCJmaXJzdE5hbWUiOiJFZHVwb3J0In0.6Pv0XwIZr_X2kd-CNJ48Z-4_4NLsearRH9YBOUTtBV2nptmsGD1FPj_7DZRtveTdUMFIzF-cn5sRd8zjYElLJw'
}, {
  id: '2',
  email: 'user@demo.com',
  username: 'demo_admin',
  password: '123456',
  firstName: 'Admin',
  lastName: 'User',
  role: 'Admin',
  token: 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJDb2RlcnRoZW1lcyIsImF1ZCI6Imh0dHBzOi8vY29kZXJ0aGVtZXMuY29tLyIsInN1YiI6InN1cHBvcnRAY29kZXJ0aGVtZXMuY29tIiwibGFzdE5hbWUiOiJDb2RlcnRoZW1lcyIsIkVtYWlsIjoic3VwcG9ydEBjb2RlcnRoZW1lcy5jb20iLCJSb2xlIjoiQWRtaW4iLCJmaXJzdE5hbWUiOiJFZHVwb3J0In0.6Pv0XwIZr_X2kd-CNJ48Z-4_4NLsearRH9YBOUTtBV2nptmsGD1FPj_7DZRtveTdUMFIzF-cn5sRd8zjYElLJw'
}];
export default function configureFakeBackend() {
  mock.onPost('/login').reply(function (config) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise(function (resolve, _reject) {
      setTimeout(function () {
        // get parameters from post request
        const params = JSON.parse(config.data);
        // find if any user matches login credentials
        const filteredUsers = fakeUsers.filter(user => {
          return user.email === params.email && user.password === params.password;
        });
        if (filteredUsers.length) {
          // if login details are valid return user details and fake jwt token
          const user = filteredUsers[0];
          resolve([200, user]);
        } else {
          // else return error
          resolve([401, {
            error: 'Username or password is incorrect'
          }]);
        }
      }, 1000);
    });
  });
}