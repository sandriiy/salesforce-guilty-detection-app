// TODO: fflib
public with sharing class PermissionAssignmentSelector {
    public List<PermissionSetAssignment> selectByUserIdAndPermissionSetIds(Id userId, List<Id> setIds) {
        return [
            SELECT Id, AssigneeId, PermissionSetId
            FROM PermissionSetAssignment
            WHERE AssigneeId = :userId AND PermissionSetId IN :setIds
        ];
    }

    public List<PermissionSetAssignment> selectByUserIdAndPermissionSets(Id userId, List<PermissionSet> permissionSets) {
        return [
            SELECT Id, AssigneeId, PermissionSetId
            FROM PermissionSetAssignment
            WHERE AssigneeId = :userId AND PermissionSetId IN :permissionSets
        ];
    }
}