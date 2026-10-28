export const floatingTabBar = {
  height: 60,
  bottomGap: 10,
  contentGap: 12,
} as const;

export function tabBarContentInset(bottomInset: number) {
  return floatingTabBar.height + Math.max(bottomInset, floatingTabBar.bottomGap) + floatingTabBar.contentGap;
}
