import React, { useState } from 'react';

import { Panel, PanelHeader, Stack, Button, Input } from 'react-figma-ui/ui';

interface ProfileDetailViewProps {
  profileId: string;
  profileName: string;
  profileCount: number;
  renameProfile: (profileId: string, profileName: string) => void;
  deleteProfile: (profileId: string) => void;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
}

export const ProfileDetailView = ({
  profileId,
  profileName: initialProfileName,
  profileCount,
  renameProfile,
  deleteProfile,
  setCurrentView,
}: ProfileDetailViewProps) => {
  const [profileName, setProfileName] = useState(initialProfileName);

  return (
    <Panel hasLeftRightPadding={false} hasTopBottomPadding bottomBorder={false}>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title={initialProfileName || 'Profile'}
          isActive
          hasBackButton
          onClick={() => {
            setCurrentView('main');
          }}
        />
      </Stack>

      <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
        <Stack gap="var(--space-extra-small)">
          <Input
            id="profile-name"
            placeholder="Profile name"
            value={profileName}
            onChange={(value: string) => {
              setProfileName(value);
            }}
          />
        </Stack>

        <Stack hasTopBottomPadding gap="var(--space-extra-small)">
          <Button
            label="Save"
            fullWidth
            secondary
            disabled={
              !profileName.trim() || profileName.trim() === initialProfileName
            }
            onClick={() => {
              const trimmed = profileName.trim();
              if (!trimmed) return;
              renameProfile(profileId, trimmed);
              setCurrentView('main');
            }}
          />

          <Button
            label="Remove"
            fullWidth
            secondary
            danger
            disabled={profileCount <= 1}
            onClick={() => {
              deleteProfile(profileId);
              setCurrentView('main');
            }}
          />
        </Stack>
      </Stack>
    </Panel>
  );
};
