public class AccessControlService {
    private final Map<String, PermissionSet> GUILTY_PERMISSION_SETS = new Map<String, PermissionSet>();
    private final List<String> GUILTY_PERMISSION_NAMES = new List<String>{
        GuiltyConstants.GUILTY_REVIEWER_PERMISSION,
        GuiltyConstants.GUILTY_ADMIN_PERMISSION
    };
    private final Map<String, List<String>> ROLE_TO_PERMISSION_SET_NAME = new Map<String, List<String>>{
        'Reviewer' => new List<String>{ GuiltyConstants.GUILTY_REVIEWER_PERMISSION },
        'Admin' => new List<String>{ GuiltyConstants.GUILTY_ADMIN_PERMISSION },
        'Both' => new List<String>{ GuiltyConstants.GUILTY_REVIEWER_PERMISSION, GuiltyConstants.GUILTY_ADMIN_PERMISSION }
    };

    public AccessControlService() {
        this.fetchPermissionSets();
    }

    public List<PermissionSetAssignment> assignReviewerPermission(List<Id> userIds) {
        List<PermissionSetAssignment> assignedPermissions = new List<PermissionSetAssignment>();
        for (Id userId : userIds) {
            assignedPermissions.add(new PermissionSetAssignment(
                AssigneeId = userId,
                PermissionSetId = GUILTY_PERMISSION_SETS.get(GuiltyConstants.GUILTY_REVIEWER_PERMISSION).Id
            ));
        }

        return assignedPermissions;
    }

    public List<PermissionSetAssignment> assignAdminPermission(List<Id> userIds) {
        List<PermissionSetAssignment> assignedPermissions = new List<PermissionSetAssignment>();
        for (Id userId : userIds) {
            assignedPermissions.add(new PermissionSetAssignment(
                AssigneeId = userId,
                PermissionSetId = GUILTY_PERMISSION_SETS.get(GuiltyConstants.GUILTY_ADMIN_PERMISSION).Id
            ));
        }

        return assignedPermissions;
    }

    public List<PermissionSetAssignment> assignPermissions(Id userId, String role) {
        List<PermissionSetAssignment> assignedPermissions = new List<PermissionSetAssignment>();

        List<String> permissionSetNames = ROLE_TO_PERMISSION_SET_NAME.get(role);
        List<Id> permissionSetIdsToAssign = fetchPermissionSetIds(permissionSetNames);

        for (Id permissionSetIdToAssign : permissionSetIdsToAssign) {
            assignedPermissions.add(new PermissionSetAssignment(
                AssigneeId = userId,
                PermissionSetId = permissionSetIdToAssign
            ));
        }

        return assignedPermissions;
    }

    public List<PermissionSetAssignment> removeMemberPermissions(Id userId, String role) {
        List<String> permissionSetNames = ROLE_TO_PERMISSION_SET_NAME.get(role);
        List<Id> permissionSetIdsToRemove = fetchPermissionSetIds(permissionSetNames);

        return new PermissionAssignmentSelector().selectByUserIdAndPermissionSetIds(
            userId,
            permissionSetIdsToRemove
        );
    }

    public List<PermissionSetAssignment> removeMemberPermissions(Id userId) {
        return new PermissionAssignmentSelector().selectByUserIdAndPermissionSets(
            userId,
            GUILTY_PERMISSION_SETS.values()
        );
    }

    private void fetchPermissionSets() {
        List<PermissionSet> permissionSets = new PermissionSetSelector().selectByName(GUILTY_PERMISSION_NAMES);
        for (PermissionSet permissionSet : permissionSets) {
            GUILTY_PERMISSION_SETS.put(permissionSet.Name, permissionSet); 
        }
    }

    private List<Id> fetchPermissionSetIds(List<String> permissionSetNames) {
        List<Id> permissionSetIds = new List<Id>();
        for (String permissionSetName : permissionSetNames) {
            permissionSetIds.add(GUILTY_PERMISSION_SETS.get(permissionSetName).Id);
        }

        return permissionSetIds;
    }
}