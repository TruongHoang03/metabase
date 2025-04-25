import { skipToken } from "@reduxjs/toolkit/query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { t } from "ttag";
import { isEqual } from "underscore";

import {
  useCreateNotificationMutation,
  useGetChannelInfoQuery,
  useGetDefaultNotificationTemplateQuery,
  useGetNotificationPayloadExampleQuery,
  useListChannelsQuery,
  usePreviewNotificationTemplateQuery,
  useUpdateNotificationMutation,
} from "metabase/api";
import { useEscapeToCloseModal } from "metabase/common/hooks/use-escape-to-close-modal";
import ButtonWithStatus from "metabase/components/ButtonWithStatus";
import { ConfirmModal } from "metabase/components/ConfirmModal";
import { AutoWidthSelect } from "metabase/components/Schedule/AutoWidthSelect";
import { Avatar } from "metabase/components/UserAvatar/UserAvatar";
import CS from "metabase/css/core/index.css";
import { alertIsValid } from "metabase/lib/notifications";
import {
  getHasConfiguredAnyChannel,
  getHasConfiguredEmailChannel,
} from "metabase/lib/pulse";
import { useDispatch, useSelector } from "metabase/lib/redux";
import { ChannelSetupModal } from "metabase/notifications/modals/shared/ChannelSetupModal";
import { AlertModalSettingsBlock } from "metabase/notifications/modals/shared/components/AlertModalSettingsBlock/AlertModalSettingsBlock";
import { AlertTriggerIcon } from "metabase/notifications/modals/shared/components/AlertTriggerIcon";
import { NotificationChannelsPicker } from "metabase/notifications/modals/shared/components/NotificationChannels/NotificationChannelsPicker/NotificationChannelsPicker";
import { getDefaultTableNotificationRequest } from "metabase/notifications/utils";
import { addUndo } from "metabase/redux/undo";
import { canAccessSettings, getUser } from "metabase/selectors/user";
import {
  Box,
  Button,
  Flex,
  Icon,
  Loader,
  Modal,
  Stack,
  Text,
  rem,
} from "metabase/ui";
import type {
  ChannelTemplate,
  CreateTableNotificationRequest,
  NotificationChannelType,
  NotificationHandler,
  NotificationTriggerEvent,
  PreviewNotificationTemplateResponse,
  TableId,
  TableNotification,
  UpdateTableNotificationRequest,
} from "metabase-types/api";

type TableNotificationTriggerOption = {
  value: {
    eventName: NotificationTriggerEvent;
  };
  label: string;
};

const NOTIFICATION_TRIGGER_OPTIONS_MAP: Record<
  NotificationTriggerEvent,
  TableNotificationTriggerOption
> = {
  "event/rows.created": {
    value: {
      eventName: "event/rows.created",
    },
    label: t`When new records are created`,
  },
  "event/rows.updated": {
    value: {
      eventName: "event/rows.updated",
    },
    label: t`When any cell changes it's value`,
  },
  "event/rows.deleted": {
    value: {
      eventName: "event/rows.deleted",
    },
    label: t`When records are deleted`,
  },
};

type CreateOrEditTableNotificationModalProps = {
  tableId: TableId;
  onClose: () => void;
} & (
  | {
      notification: null;
      onNotificationCreated: () => void;
      onNotificationUpdated?: () => void;
    }
  | {
      notification: TableNotification;
      onNotificationUpdated: () => void;
      onNotificationCreated?: () => void;
    }
);

interface PreviewMessagePanelProps {
  opened: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: any;
  previewContent?: PreviewNotificationTemplateResponse["rendered"]; // <-- Add previewContent prop
}

const PreviewMessagePanel = ({
  opened,
  onClose,
  isLoading,
  error,
  previewContent,
}: PreviewMessagePanelProps) => {
  if (!opened) {
    return null;
  }

  const htmlContent = previewContent?.body?.[0]?.content;

  return (
    <Flex
      direction="column"
      h="100%"
      mt="1.5rem"
      px="2.5rem"
      gap="md"
      style={{
        height: "100%",
        borderLeft: "1px solid var(--mb-color-border)",
        position: "sticky",
        top: 0,
      }}
    >
      <Flex gap="sm" align="center">
        <Icon
          tooltip={t`Close Preview`}
          name="eye_crossed_out"
          size={16}
          onClick={onClose}
          style={{
            cursor: "pointer",
          }}
        />
        <Text size="lg" fw={700}>{t`Preview`}</Text>
      </Flex>
      <Box style={{ overflowY: "auto", flexGrow: 1 }}>
        {isLoading && (
          <Flex align="center" justify="center" gap="sm" py="md">
            <Loader size={12} />
            <Text size="lg" c="text-medium">{t`Loading preview...`}</Text>
          </Flex>
        )}
        {error && (
          <Text color="error">
            {t`Error loading preview:`} {JSON.stringify(error)}
          </Text>
        )}
        {previewContent ? (
          <Box
            style={{
              border: "1px solid var(--mb-color-border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--mb-color-bg-white)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              // minHeight: 120,
            }}
          >
            {/* Header */}
            <Box
              bg="var(--mb-color-bg-white)"
              py="md"
              px="lg"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 16,
                borderBottom: "1px solid var(--mb-color-border)",
              }}
            >
              <Avatar size={32} style={{ flexShrink: 0 }}>
                {previewContent.from || "?"}
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={600} mb={2}>
                  {t`From:`}
                </Text>
                <Text size="sm" mb={6}>
                  {previewContent.from}
                </Text>
                {previewContent.bcc.length > 0 && (
                  <>
                    <Text size="sm" fw={600} mb={2}>{t`BCC:`}</Text>
                    <Text size="sm" mb={6}>
                      {previewContent.bcc.join(", ")}
                    </Text>
                  </>
                )}
                <Text size="sm" fw={600} mb={2}>{t`Subject:`}</Text>
                <Text size="sm">{previewContent.subject}</Text>
              </Box>
            </Box>
            {/* Body */}
            <Box bg="var(--mb-color-bg-white)" p="lg" style={{ width: "100%" }}>
              {htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              ) : (
                <Text color="text-medium">{t`(No body content)`}</Text>
              )}
            </Box>
          </Box>
        ) : (
          <Text color="text-medium">{t`No preview available.`}</Text>
        )}
      </Box>
    </Flex>
  );
};

export const CreateOrEditTableNotificationModal = ({
  tableId,
  notification,
  onNotificationCreated,
  onNotificationUpdated,
  onClose,
}: CreateOrEditTableNotificationModalProps) => {
  const dispatch = useDispatch();
  const user = useSelector(getUser);
  const userCanAccessSettings = useSelector(canAccessSettings);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<ChannelTemplate | null>(null); // <-- State for template to preview

  const isEditMode = !!notification?.id;
  const [requestBody, setRequestBody] = useState<
    CreateTableNotificationRequest | UpdateTableNotificationRequest | null
  >(null);

  // Compute channel types for template query
  const channelTypes = requestBody?.handlers
    ? requestBody.handlers
        .map((h) => h.channel_type)
        .filter((v, i, arr) => !!v && arr.indexOf(v) === i)
    : [];

  // Use query hook for default templates (enabled only when event and handlers are present)
  const { data: defaultTemplates } = useGetDefaultNotificationTemplateQuery(
    requestBody?.payload?.event_name && channelTypes.length > 0
      ? {
          notification: {
            payload_type: requestBody.payload_type,
            payload: requestBody.payload,
          },
          channel_types: channelTypes,
        }
      : skipToken,
    {
      skip: !requestBody?.payload?.event_name || channelTypes.length === 0,
    },
  );
  const { data: templateJson } = useGetNotificationPayloadExampleQuery(
    requestBody?.payload_type &&
      requestBody?.payload?.event_name &&
      user &&
      channelTypes.length > 0
      ? {
          payload_type: requestBody.payload_type,
          payload: requestBody.payload,
          creator_id: user.id,
        }
      : skipToken,
    {
      skip: !requestBody?.payload?.event_name || channelTypes.length === 0,
    },
  );

  const { data: channelSpec, isLoading: isLoadingChannelInfo } =
    useGetChannelInfoQuery();
  const { data: hookChannels } = useListChannelsQuery();

  const [createNotification] = useCreateNotificationMutation();
  const [updateNotification] = useUpdateNotificationMutation();

  const hasConfiguredAnyChannel = getHasConfiguredAnyChannel(channelSpec);
  const hasConfiguredEmailChannel = getHasConfiguredEmailChannel(channelSpec);

  const triggerOptions = useMemo(
    () =>
      (
        [
          "event/rows.created",
          "event/rows.updated",
          "event/rows.deleted",
        ] as NotificationTriggerEvent[]
      ).map((event) => ({
        value: event,
        label: NOTIFICATION_TRIGGER_OPTIONS_MAP[event].label,
        option: NOTIFICATION_TRIGGER_OPTIONS_MAP[event],
      })),
    [],
  );

  useEffect(() => {
    if (tableId && channelSpec && user && hookChannels && !requestBody) {
      const defaultOption =
        NOTIFICATION_TRIGGER_OPTIONS_MAP["event/rows.created"];
      setRequestBody(
        isEditMode
          ? { ...notification }
          : getDefaultTableNotificationRequest({
              tableId,
              eventName: defaultOption.value.eventName,
              currentUserId: user.id,
              channelSpec,
              hookChannels,
              userCanAccessSettings,
            }),
      );
    }
  }, [
    requestBody,
    channelSpec,
    triggerOptions,
    user,
    isEditMode,
    hookChannels,
    userCanAccessSettings,
    tableId,
    notification,
  ]);

  const onCreateOrEditAlert = async () => {
    if (requestBody) {
      let result;

      if (isEditMode) {
        result = await updateNotification(
          requestBody as UpdateTableNotificationRequest,
        );
      } else {
        result = await createNotification(requestBody);
      }

      if (result.error) {
        dispatch(
          addUndo({
            icon: "warning",
            toastColor: "error",
            message: t`Failed to save alert.`,
          }),
        );

        // need to throw to show error in ButtonWithStatus
        throw result.error;
      }

      dispatch(
        addUndo({
          message: isEditMode
            ? t`Your alert was updated.`
            : t`Your alert is all set up.`,
        }),
      );

      if (isEditMode) {
        onNotificationUpdated?.();
      } else {
        onNotificationCreated?.();
      }
    }
  };

  const channelRequirementsMet = userCanAccessSettings
    ? hasConfiguredAnyChannel
    : hasConfiguredEmailChannel;

  const hasChanges = useMemo(
    () => notification && !isEqual(requestBody, notification),
    [requestBody, notification],
  );

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleCloseAttempt = useCallback(() => {
    if (isConfirmModalOpen) {
      return;
    }

    if (hasChanges) {
      setIsConfirmModalOpen(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose, isConfirmModalOpen]);

  const handleConfirmDiscard = useCallback(() => {
    setIsConfirmModalOpen(false);
    onClose();
  }, [onClose]);
  useEscapeToCloseModal(handleCloseAttempt, { capture: false });

  const handlePreviewClick = useCallback(
    (channelType: NotificationChannelType) => {
      const handler = requestBody?.handlers.find(
        (h) => h.channel_type === channelType && h.template,
      );
      const currentTemplate =
        handler?.template || defaultTemplates?.[channelType];
      if (currentTemplate) {
        setPreviewTemplate(currentTemplate);
        setPreviewOpen(true);
      } else {
        setPreviewTemplate(null);
        setPreviewOpen(false);
      }
    },
    [requestBody, defaultTemplates],
  );

  const handlePreviewClose = useCallback(() => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
  }, []);

  // Fetch preview when panel is open and a template is selected
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewError,
  } = usePreviewNotificationTemplateQuery(
    previewOpen && requestBody && previewTemplate
      ? { notification: requestBody, template: previewTemplate }
      : skipToken,
  );

  if (!isLoadingChannelInfo && channelSpec && !channelRequirementsMet) {
    return (
      <ChannelSetupModal
        userCanAccessSettings={userCanAccessSettings}
        onClose={onClose}
      />
    );
  }

  if (!requestBody || !requestBody.payload) {
    return null;
  }

  const isValid = alertIsValid(requestBody.handlers, channelSpec);

  return (
    <Modal
      data-testid="table-notification-create"
      opened
      size={previewOpen ? rem(1000) : rem(680)}
      onClose={handleCloseAttempt}
      padding="2.5rem"
      closeOnEscape={false}
      title={isEditMode ? t`Edit alert` : t`New alert`}
      styles={{
        body: {
          paddingLeft: 0,
          paddingRight: 0,
        },
      }}
    >
      <div
        style={{
          position: "relative",
          display: "grid",
          width: "100%",
          height: "100%",
          gridTemplateColumns: previewOpen ? "50% 50%" : "100%",
          transition: "grid-template-columns 0.3s ease",
        }}
      >
        <Stack gap="xl" mt="1.5rem" mb="2rem" px="2.5rem">
          <AlertModalSettingsBlock
            title={t`What do you want to be notified about?`}
          >
            <Flex gap="lg" align="center">
              <AlertTriggerIcon />
              <AutoWidthSelect
                data-testid="notification-event-select"
                data={triggerOptions}
                value={requestBody.payload.event_name}
                onChange={(value) => {
                  if (value) {
                    const selectedOption =
                      NOTIFICATION_TRIGGER_OPTIONS_MAP[
                        value as NotificationTriggerEvent
                      ];
                    if (selectedOption) {
                      setRequestBody({
                        ...requestBody,
                        payload: {
                          ...requestBody.payload,
                          event_name: selectedOption.value.eventName,
                        },
                      });
                    }
                  }
                }}
              />
            </Flex>
          </AlertModalSettingsBlock>
          <AlertModalSettingsBlock
            title={t`Where do you want to send the alerts?`}
            contentProps={{ style: { overflow: "visible" } }}
          >
            <NotificationChannelsPicker
              enableTemplates
              notificationHandlers={requestBody.handlers}
              channels={channelSpec ? channelSpec.channels : undefined}
              onChange={(newHandlers: NotificationHandler[]) => {
                setRequestBody({
                  ...requestBody,
                  handlers: newHandlers,
                });
              }}
              templateContext={templateJson}
              defaultTemplates={defaultTemplates}
              onPreviewClick={handlePreviewClick}
              getInvalidRecipientText={(domains) =>
                t`You're only allowed to email alerts to addresses ending in ${domains}`
              }
            />
          </AlertModalSettingsBlock>
        </Stack>

        {/* Preview Message Panel */}
        {previewOpen && (
          <PreviewMessagePanel
            opened={true}
            onClose={handlePreviewClose}
            isLoading={isPreviewLoading} // <-- Pass loading state
            error={previewError} // <-- Pass error state
            previewContent={previewData?.rendered} // <-- Pass rendered content
          />
        )}
      </div>
      <Flex justify="flex-end" px="2.5rem" pt="lg" className={CS.borderTop}>
        <Button
          onClick={handleCloseAttempt}
          className={CS.mr2}
        >{t`Cancel`}</Button>
        <ButtonWithStatus
          titleForState={{
            default: isEditMode && hasChanges ? t`Save changes` : t`Done`,
          }}
          disabled={!isValid}
          onClickOperation={onCreateOrEditAlert}
        />
      </Flex>

      {hasChanges && (
        <ConfirmModal
          size="md"
          opened={isConfirmModalOpen}
          title={t`Discard unsaved changes?`}
          message={t`You have unsaved changes. Are you sure you want to discard them?`}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmDiscard}
          confirmButtonText={t`Discard`}
          closeButtonText={t`Cancel`}
          closeOnEscape={false}
          confirmButtonPrimary={false}
        />
      )}
    </Modal>
  );
};
