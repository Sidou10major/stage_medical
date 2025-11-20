module.exports = {
  roles: {
    student: 'student',
    doctor: 'doctor',
    service_chief: 'service_chief',
    dean: 'dean'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN
  }
};