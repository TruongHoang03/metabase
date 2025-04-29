import { useEffect } from "react";
import _ from "underscore";

import { InteractiveAdHocQuestion } from "embedding-sdk/components/private/InteractiveAdHocQuestion";
import {
  DashboardNotFoundError,
  SdkLoader,
} from "embedding-sdk/components/private/PublicComponentWrapper";
import { StyledPublicComponentWrapper } from "embedding-sdk/components/public/InteractiveDashboard/EditableDashboard.styled";
import {
  type SdkDashboardDisplayProps,
  useSdkDashboardParams,
} from "embedding-sdk/hooks/private/use-sdk-dashboard-params";
import { useSdkDispatch, useSdkSelector } from "embedding-sdk/store";
import { getEventHandlers } from "embedding-sdk/store/selectors";
import type { DashboardEventHandlersProps } from "embedding-sdk/types/dashboard";
import type { MetabasePluginsConfig } from "embedding-sdk/types/plugins";
import { Dashboard } from "metabase/dashboard/components/Dashboard/Dashboard";
import {
  DASHBOARD_EDITING_ACTIONS,
  SDK_DASHBOARD_VIEW_ACTIONS,
} from "metabase/dashboard/components/DashboardHeader/DashboardHeaderButtonRow/constants";
import { DashboardContextProvider } from "metabase/dashboard/context";
import { getIsEditing } from "metabase/dashboard/selectors";
import { useSelector } from "metabase/lib/redux";
import { setErrorPage } from "metabase/redux/app";
import { getErrorPage } from "metabase/selectors/app";
import type { Dashboard as IDashboard } from "metabase-types/api";

import type { DrillThroughQuestionProps } from "../InteractiveQuestion/InteractiveQuestion";

import { InteractiveDashboardProvider } from "./context";
import { useCommonDashboardParams } from "./use-common-dashboard-params";

/**
 * @interface
 * @expand
 * @category InteractiveDashboard
 */
export type EditableDashboardProps = {
  /**
   * Height of a question component when drilled from the dashboard to a question level.
   */
  drillThroughQuestionHeight?: number;

  /**
   * Additional mapper function to override or add drill-down menu. See the implementing custom actions section for more details.
   */
  plugins?: MetabasePluginsConfig;

  /**
   * Props for the drill-through question
   */
  drillThroughQuestionProps?: DrillThroughQuestionProps;
} & Omit<SdkDashboardDisplayProps, "withTitle" | "hiddenParameters"> &
  DashboardEventHandlersProps;

/**
 * A dashboard component with the features available in the `InteractiveDashboard` component, as well as the ability to add and update questions, layout, and content within your dashboard.
 *
 * @function
 * @category InteractiveDashboard
 * @param props
 */
export const EditableDashboard = ({
  dashboardId,
  initialParameters = {},
  withDownloads = false,
  drillThroughQuestionHeight,
  plugins,
  onLoad,
  onLoadWithoutCards,
  className,
  style,
  drillThroughQuestionProps = {
    title: true,
    height: drillThroughQuestionHeight,
    plugins: plugins,
  },
}: EditableDashboardProps) => {
  const {
    ref,
    isFullscreen,
    onFullscreenChange,
    refreshPeriod,
    onRefreshPeriodChange,
    setRefreshElapsedHook,
  } = useSdkDashboardParams({
    dashboardId,
    withDownloads,
    withTitle: true,
    hiddenParameters: undefined,
    initialParameters,
  });

  const sdkEventHandlers = useSelector(getEventHandlers);

  const {
    adhocQuestionUrl,
    onNavigateBackToDashboard,
    onEditQuestion,
    onNavigateToNewCardFromDashboard,
  } = useCommonDashboardParams({
    dashboardId,
  });

  const isEditing = useSdkSelector(getIsEditing);
  const dashboardActions = isEditing
    ? DASHBOARD_EDITING_ACTIONS
    : SDK_DASHBOARD_VIEW_ACTIONS;

  const handleOnLoad = (dashboard: IDashboard) => {
    sdkEventHandlers?.onDashboardLoad?.(dashboard);
    onLoad?.(dashboard);
  };

  const handleOnLoadWithoutCards = (dashboard: IDashboard) => {
    sdkEventHandlers?.onDashboardLoadWithoutCards?.(dashboard);
    onLoadWithoutCards?.(dashboard);
  };

  return (
    /* TODO: Combine InteractiveDashboardProvider and DashboardContextProvider */
    <StyledPublicComponentWrapper className={className} style={style}>
      <InteractiveDashboardProvider
        plugins={plugins}
        onEditQuestion={onEditQuestion}
        dashboardActions={dashboardActions}
      >
        <DashboardContextProvider
          dashboardId={dashboardId}
          parameterQueryParams={initialParameters}
          refreshPeriod={refreshPeriod}
          onRefreshPeriodChange={onRefreshPeriodChange}
          setRefreshElapsedHook={setRefreshElapsedHook}
          isFullscreen={isFullscreen}
          onFullscreenChange={onFullscreenChange}
          // onNavigateToNewCardFromDashboard={onNavigateToNewCardFromDashboard}
          // navigateToNewCardFromDashboard={onNavigateToNewCardFromDashboard}
          downloadsEnabled={withDownloads}
          onLoad={handleOnLoad}
          onLoadWithoutCards={handleOnLoadWithoutCards}
          onError={(e) => console.log(e)}
          isNightMode={false}
          onNightModeChange={_.noop}
          hasNightModeToggle={false}
          autoScrollToDashcardId={undefined}
          reportAutoScrolledToDashcard={_.noop}
        >
          <Dashboard />
        </DashboardContextProvider>
      </InteractiveDashboardProvider>
    </StyledPublicComponentWrapper>
  );
};
