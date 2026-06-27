import { Button } from "@/components/ui/button";
import CircleBackButton from "@/components/ui/circle-back-button";
import { Input } from "@/components/ui/input";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Country } from "react-native-country-picker-modal";
import { PhoneInput, isValidNumber } from "react-native-phone-entry";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupDetailsScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+92");
  const [countryCode, setCountryCode] = useState("PK");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validateFullName = (name: string): boolean => {
    if (!name.trim()) {
      setFullNameError("Full name is required");
      return false;
    }
    if (name.trim().length < 2) {
      setFullNameError("Name must be at least 2 characters");
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      setFullNameError("Name can only contain letters and spaces");
      return false;
    }
    setFullNameError("");
    return true;
  };

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError("Email is required");
      return false;
    }
    // Better email regex - accepts standard email formats
    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone || phone === "+92") {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!isValidNumber(phone, countryCode)) {
      setPhoneError("Please enter a valid phone number");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (text: string) => {
    let formattedText = text;

    // If user enters 0 at the start (Pakistani format), convert to 92
    if (countryCode === "PK") {
      if (text.startsWith("0") && !text.startsWith("92")) {
        // Remove leading 0 and add 92
        formattedText = "92" + text.slice(1);
      }
    }

    setPhoneNumber(formattedText);
  };

  const handleNext = () => {
    // Validate all fields
    const isNameValid = validateFullName(fullName);
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phoneNumber);

    if (!isNameValid || !isEmailValid || !isPhoneValid) {
      return;
    }

    // Pass data to password screen via navigation params
    router.push({
      pathname: "/(auth)/register-password",
      params: {
        fullName,
        email,
        country: selectedCountry?.name || countryCode,
        phoneNumber,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 p-2 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Back Button */}
          <CircleBackButton className="ml-4 mt-2 mb-2" />
          {/* Header */}
          <View className="px-4 mt-2">
            <View>
              <Text
                className="text-5xl text-primary mt-2 mb-1 font-poppins-semibold"
                style={{ lineHeight: 55 }}
              >
                Register
              </Text>
              <Text className="text-text text-sm font-poppins-light mb-2">
                Enter Your Details
              </Text>
            </View>

            {/* Illustration */}
            <View className="items-center justify-center mb-7">
              <Image
                source={require("@/assets/images/Register1st_2x.webp")}
                style={{
                  width: wp("75%"),
                  height: hp("28%"),
                  resizeMode: "contain",
                  transform: [{ scaleX: -1 }],
                  alignSelf: "center",
                }}
              />
            </View>

            {/* Form */}
            <View>
              {/* Full Name Input */}
              <Input
                containerClassName="mb-1 mx-2"
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                onBlur={() => validateFullName(fullName)}
                autoComplete="name"
                error={fullNameError}
                fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center border-0"
                inputClassName="text-base text-black font-poppins-light py-0"
              />

              {/* Email Input */}
              <Input
                containerClassName="mb-1 mt-3 mx-2"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
                fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center border-0"
                inputClassName="text-base text-black font-poppins-light py-0"
              />

              {/* Phone Number Input */}
              <View className="mt-3 mx-2">
                <PhoneInput
                  defaultValues={{
                    countryCode: "PK",
                    callingCode: "+92",
                    phoneNumber: "+92",
                  }}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  onChangeCountry={(country) => {
                    setCountryCode(country.cca2 as string);
                    setSelectedCountry(country);
                    // Reset phone number when country changes
                    setPhoneNumber(
                      country.callingCode ? `+${country.callingCode}` : "+92",
                    );
                    setPhoneError("");
                  }}
                  autoFocus={false}
                  disabled={false}
                  countryPickerProps={{
                    withFilter: true,
                    withFlag: true,
                    withCountryNameButton: true,
                    // Use bundled image flags instead of emoji (emoji flags render
                    // as "?" on devices/fonts without flag-emoji support).
                    withEmoji: false,
                  }}
                  theme={{
                    containerStyle: {
                      borderRadius: 16,
                      backgroundColor: "#EDD8A9",
                      paddingHorizontal: 8,
                      paddingVertical: 0,
                      marginTop: 0,
                      marginBottom: 12,
                      borderWidth: phoneError ? 2 : 0,
                      borderColor: phoneError ? "#ef4444" : "transparent",
                    },
                    textInputStyle: {
                      fontSize: 16,
                      color: "#3B3328",
                      fontFamily: "Poppins_300Light",
                    },
                    flagButtonStyle: {
                      paddingHorizontal: 8,
                    },
                    codeTextStyle: {
                      fontSize: 16,
                      color: "#3B3328",
                      fontFamily: "Poppins_600SemiBold",
                      marginRight: 4,
                    },
                  }}
                  hideDropdownIcon={false}
                  isCallingCodeEditable={false}
                />
                {phoneError ? (
                  <Text className="text-red-500 text-sm font-poppins-regular mt-1 ml-2">
                    {phoneError}
                  </Text>
                ) : null}
              </View>

              {/* Next Button */}
              <Button onPress={handleNext} size="lg" className="w-full mt-6">
                Next
              </Button>
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-center mt-6 mb-8">
              <Text className="text-text text-base">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text className="text-primary font-poppins-semibold text-base">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
