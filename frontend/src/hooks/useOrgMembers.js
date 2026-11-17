import { useEffect, useState } from "react";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

/**
 * Active members of an organization as plain user objects ({ _id, name, email, avatar }).
 * Backend caps a page at 50, which covers pickers in this app.
 */
const useOrgMembers = (orgId) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);

    api
      .get(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId), { params: { limit: 50 } })
      .then((res) => {
        if (cancelled) return;
        const users = (res.data.data || []).map((m) => m.user).filter((u) => u?._id);
        setMembers(users);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return { members, loading };
};

export default useOrgMembers;
