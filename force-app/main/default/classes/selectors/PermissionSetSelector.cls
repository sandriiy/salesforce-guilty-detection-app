// TODO: fflib
public with sharing class PermissionSetSelector {
    public List<PermissionSet> selectByName(List<String> names) {
        return [
            SELECT Id, Name
            FROM PermissionSet
            WHERE Name IN :names
        ];
    }
}