public class GuiltyCacheService {
    private final String compositeKey;

    public GuiltyCacheService(String guiltyPartKey, String guiltyUniqueKey) {
        this.compositeKey = (
            GuiltyConstants.GUILTY_NAMESPACE + '.'
            + GuiltyConstants.GUILTY_PARTITION_NAME + '.'
            + guiltyPartKey + guiltyUniqueKey
        );
    }

    public void put(Object value) {
        Cache.Session.put(compositeKey, value);
    }

    public Object get() {
        return Cache.Session.get(compositeKey);
    }

    public Boolean exists() {
        return Cache.Session.contains(compositeKey) && get() != null;
    }

    public void remove() {
        Cache.Session.remove(compositeKey);
    }
}