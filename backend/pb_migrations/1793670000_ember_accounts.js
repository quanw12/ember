migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new BoolField({ name: 'blocked' }));
  users.listRule = 'id = @request.auth.id';
  users.viewRule = 'id = @request.auth.id';
  users.createRule = '@request.body.blocked:isset = false';
  users.updateRule = 'id = @request.auth.id && @request.body.blocked:changed = false && @request.body.verified:changed = false';
  users.deleteRule = null;
  users.authRule = 'blocked = false';
  app.save(users);
  const snapshots = new Collection({
    type: 'base', name: 'snapshots',
    listRule: '@request.auth.id != "" && owner = @request.auth.id && @request.auth.blocked = false',
    viewRule: '@request.auth.id != "" && owner = @request.auth.id && @request.auth.blocked = false',
    createRule: '@request.auth.id != "" && owner = @request.auth.id && @request.auth.blocked = false',
    updateRule: '@request.auth.id != "" && owner = @request.auth.id && @request.body.owner:changed = false && @request.auth.blocked = false',
    deleteRule: '@request.auth.id != "" && owner = @request.auth.id && @request.auth.blocked = false',
    fields: [{ type: 'relation', name: 'owner', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
      { type: 'file', name: 'backup', required: true, maxSelect: 1, maxSize: 52428800, mimeTypes: ['application/json'], protected: true }],
    indexes: ['CREATE UNIQUE INDEX idx_snapshot_owner ON snapshots (owner)']
  });
  app.save(snapshots);
  const settings = app.settings();
  settings.meta.appName = 'EMBER';
  settings.rateLimits.enabled = true;
  app.save(settings);
});
