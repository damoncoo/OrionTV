import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useSettingsStore } from "./settingsStore";
import Toast from "react-native-toast-message";

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_TOKEN_KEY = "auth_token";

const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),
  checkLoginStatus: async (apiBaseUrl?: string) => {
    if (!apiBaseUrl) {
        set({ isLoggedIn: false });
        return;
    }
    try {
        const serverConfig = useSettingsStore.getState().serverConfig;
        if (!serverConfig?.StorageType) {
            Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });
            return;
        }
        
        // Use AsyncStorage instead of Cookies
        const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (serverConfig && serverConfig.StorageType === "localstorage" && !authToken) {
            const loginResult = await api.login().catch(() => {
                set({ isLoggedIn: false });  // 删除: set({ isLoginModalVisible: true });
            });
            if (loginResult && loginResult.ok) {
                // Save token to AsyncStorage
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, "true");
                set({ isLoggedIn: true });  // 删除: set({ isLoginModalVisible: false });
            }
        } else {
            // Check if we have a token in AsyncStorage
            const isLoggedIn = !!authToken;
            set({ isLoggedIn });  // 删除: set({ isLoginModalVisible: !isLoggedIn });
        }
    } catch (error) {
        console.info("Failed to check login status:", error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
            // Clear token on unauthorized access
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            set({ isLoggedIn: false });  // 删除: set({ isLoginModalVisible: true });
        } else {
            set({ isLoggedIn: false });  // 删除: set({ isLoginModalVisible: true });
        }
    }
},
  logout: async () => {
    try {
      // Clear AsyncStorage instead of Cookies
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      console.info("Failed to logout:", error);
    }
  },
}));

export default useAuthStore;

