/**
 * 版本更新检查工具
 */

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseUrl: string;
  publishedAt: string;
  body: string;
}

/**
 * 比较两个版本号
 * @returns -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * 检查是否有新版本
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
  try {
    const response = await fetch('https://api.github.com/repos/feiyonggao/notes/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('获取版本信息失败');
    }

    const data = await response.json();
    const latestVersion = data.tag_name?.replace(/^v/, '') || '';
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      downloadUrl: data.html_url || 'https://github.com/feiyonggao/notes/releases/latest',
      releaseUrl: data.html_url || '',
      publishedAt: data.published_at || '',
      body: data.body || '',
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      downloadUrl: '',
      releaseUrl: '',
      publishedAt: '',
      body: '',
    };
  }
}
