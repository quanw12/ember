migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.getByName('password').min = 10;
  app.save(users);
});
