import { t } from "ttag";

import { useAdminSetting } from "metabase/api/utils";
import { LoadingAndErrorWrapper } from "metabase/components/LoadingAndErrorWrapper";
import type { EnterpriseSettings } from "metabase-types/api";

import AuthCard from "../../components/AuthCard";
import { LDAP_SCHEMA } from "../../constants";

export function LdapAuthCard() {
  const {
    value: isLdapConfigured,
    updateSettings,
    settingDetails,
    isLoading,
  } = useAdminSetting("ldap-configured?");

  const handleDeactivate = () => {
    return updateSettings(
      LDAP_SCHEMA.getDefault() as Partial<EnterpriseSettings>,
    );
  };

  if (isLoading) {
    return <LoadingAndErrorWrapper loading />;
  }

  return (
    <AuthCard
      type="ldap"
      name={t`LDAP`}
      description={t`Allows users within your LDAP directory to log in to Metabase with their LDAP credentials, and allows automatic mapping of LDAP groups to Metabase groups.`}
      isConfigured={!!isLdapConfigured}
      onDeactivate={handleDeactivate}
      setting={settingDetails}
    />
  );
}
