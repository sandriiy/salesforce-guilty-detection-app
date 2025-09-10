public with sharing class GuiltyMembersController {
    @AuraEnabled(cacheable=true)
    public static Map<String, List<User>> getAllGuiltyMembers() {
        Map<String, List<User>> guiltyUsersByPermission = new Map<String, List<User>>();
        List<User> guiltyReviewers = new UserSelector().selectWithPermissionSet(new List<String>{GuiltyConstants.GUILTY_REVIEWER_PERMISSION});
        guiltyUsersByPermission.put('Reviewers', guiltyReviewers);
        List<User> guiltyAdmins = new UserSelector().selectWithPermissionSet(new List<String>{GuiltyConstants.GUILTY_ADMIN_PERMISSION});
        guiltyUsersByPermission.put('Admins', guiltyAdmins);

        return guiltyUsersByPermission;
    }

    @AuraEnabled
    public static List<User> getAllNotGuiltyMembers() {
        List<String> guiltyPermissions = new List<String>{
            GuiltyConstants.GUILTY_REVIEWER_PERMISSION,
            GuiltyConstants.GUILTY_ADMIN_PERMISSION
        };

        return new UserSelector().selectWithoutPermissionSet(
            guiltyPermissions
        );
    }

    @AuraEnabled
    public static void addNewGuiltyMembers(List<Id> guiltyReviewerIds, List<Id> guiltyAdminIds) {
        List<PermissionSetAssignment> assignmentsToInsert = new List<PermissionSetAssignment>();

        AccessControlService accessService = new AccessControlService();
        assignmentsToInsert.addAll(accessService.assignReviewerPermission(guiltyReviewerIds));
        assignmentsToInsert.addAll(accessService.assignAdminPermission(guiltyAdminIds));

        insert assignmentsToInsert;
    }

    @AuraEnabled
    public static void updateGuiltyMemberRole(Id userId, String existingRole, String newRole) {
        AccessControlService accessService = new AccessControlService();

        List<PermissionSetAssignment> permissionsToRemove = accessService.removeMemberPermissions(userId, existingRole);
        delete permissionsToRemove;

        List<PermissionSetAssignment> permissionsToAssign = accessService.assignPermissions(userId, newRole);
        insert permissionsToAssign;
    }

    @AuraEnabled
    public static void removeGuiltyMember(Id userId) {
        AccessControlService accessService = new AccessControlService();
        List<PermissionSetAssignment> permissionsToRemove = accessService.removeMemberPermissions(userId);
        delete permissionsToRemove;
    }
}