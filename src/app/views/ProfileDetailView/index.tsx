import React, { useState } from 'react';

import {
  Panel,
  PanelHeader,
  Stack,
  Button,
  Input,
  Text,
} from 'react-figma-ui/ui';

interface ProfileDetailViewProps {
  profileId: string;
  profileName: string;
  profileCount: number;
  /** The profile is linked to a profile shared in this file */
  isShared: boolean;
  renameProfile: (profileId: string, profileName: string) => void;
  deleteProfile: (profileId: string) => void;
  shareProfileInFile: (profileId: string) => void;
  unshareProfileInFile: (profileId: string) => void;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
}

export const ProfileDetailView = ({
  profileId,
  profileName: initialProfileName,
  profileCount,
  isShared,
  renameProfile,
  deleteProfile,
  shareProfileInFile,
  unshareProfileInFile,
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
            label={isShared ? 'Update shared profile' : 'Share in this file'}
            fullWidth
            secondary
            onClick={() => {
              shareProfileInFile(profileId);
              setCurrentView('main');
            }}
          />

          {isShared && (
            <Button
              label="Stop sharing"
              fullWidth
              secondary
              onClick={() => {
                unshareProfileInFile(profileId);
                setCurrentView('main');
              }}
            />
          )}

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

        <Text style={{ opacity: 0.6 }}>
          {isShared
            ? 'Updating or removing the shared profile changes it for everyone who opens this file. '
            : ''}
          Everyone with access to this file can use a shared profile and see its
          settings, including repository, branch and URL. Tokens, keys and
          custom headers are never shared.
        </Text>
      </Stack>
    </Panel>
  );
};
