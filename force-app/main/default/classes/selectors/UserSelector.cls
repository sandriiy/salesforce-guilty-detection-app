// TODO: fflib
public with sharing class UserSelector {
    public List<User> selectWithPermissionSet(List<String> permissionNames) {
        List<User> allUsers = [
            SELECT Id, Name, Title, SmallPhotoUrl
            FROM User
            WHERE Id IN (
                SELECT AssigneeId
                FROM PermissionSetAssignment
                WHERE PermissionSet.Name IN :permissionNames
            )
        ];

        return allUsers;
    }

    public List<User> selectWithoutPermissionSet(List<String> permissionNames) {
        List<User> allUsers = [
            SELECT Id, Name, Profile.Name, UserRole.Name
            FROM User
            WHERE Id NOT IN (
                SELECT AssigneeId
                FROM PermissionSetAssignment
                WHERE PermissionSet.Name IN :permissionNames
            )
            AND IsActive = true
            AND UserType IN ('Standard', 'PowerPartner', 'StandardPartner')
        ];

        return allUsers;
    }
}