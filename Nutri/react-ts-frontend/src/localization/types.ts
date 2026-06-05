export type LocaleCode =
  | "en"
  | "de"
  | "hu"
  | "es"
  | "pt"
  | "zh-CN"
  | "ja"
  | "ko"
  | "fr"
  | "ru"
  | "hi"
  | "ar"
  | "id"
  | "it"
  | "nl"
  | "pl"
  | "tr";

export type TextDirection = "ltr" | "rtl";

export type LocaleMessages = {
  code: LocaleCode;
  nativeName: string;
  englishName: string;
  direction: TextDirection;
  common: {
    appName: string;
    tagline: string;
    search: string;
    sort: string;
    language: string;
    selectLanguage: string;
    filters: string;
    loading: string;
    error: string;
    retry: string;
    viewDetails: string;
    resultsFound: string;
    showing: string;
    noResultsTitle: string;
    noResultsHelp: string;
  };
  nav: {
    home: string;
    foods: string;
    ingredients: string;
    createFood: string;
    approvals: string;
    support: string;
    editProfile: string;
    login: string;
    register: string;
    downloadApp: string;
    account: string;
  };
  foodExplorer: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    ingredientsLabel: string;
    ingredientsPlaceholder: string;
    allIngredientsIncluded: string;
    dietaryPreferencesLabel: string;
    dietaryPreferencesPlaceholder: string;
    allDietaryPreferencesIncluded: string;
    maxHazardLabel: string;
    maxHazardHelp: string;
    loadingMatching: string;
    noMatchesTitle: string;
    noMatchesHelp: string;
    linkedIngredients: string;
  };
  ingredientExplorer: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    maxHazardLabel: string;
    maxHazardHelp: string;
    linkedFoods: string;
    noLinkedFoods: string;
    noMatchesTitle: string;
    noMatchesHelp: string;
  };
  sort: {
    safetyHighestFirst: string;
    safetyLowestFirst: string;
    safestFirst: string;
    riskiestFirst: string;
    nameAZ: string;
    nameZA: string;
    mostLinkedIngredients: string;
    fewestLinkedIngredients: string;
    mostLinkedFoods: string;
    fewestLinkedFoods: string;
    hazardLowHigh: string;
    hazardHighLow: string;
  };
  hazard: {
    label: string;
    levels: {
      0: string;
      1: string;
      2: string;
      3: string;
      4: string;
      5: string;
    };
  };
  dietary: {
    organic: string;
    glutenFree: string;
    alcoholFree: string;
    lactoseFree: string;
    paleo: string;
    keto: string;
    vegan: string;
    vegetarian: string;
    wholeFood: string;
    lowSugar: string;
    lowSodium: string;
    highFiber: string;
  };
  detail: {
    safetySnapshot: string;
    dietaryInformation: string;
    ingredientHazardLegend: string;
    pubMedEvidencePlaceholder: string;
    noIngredientsListed: string;
    profileReady: string;
  };
  foodDetail: {
    unknownRestaurant: string;
    requestDeletion: string;
    editFood: string;
    loginRequiredForDeletion: string;
    deletionRequestSubmitted: string;
    authExpired: string;
    deletionRequestFailed: string;
    requestDeletionTitle: string;
    requestDeletionConfirmation: string;
    reasonForDeletion: string;
    cancel: string;
    submitting: string;
    hazardSummary: string;
    aiResearchRating: string;
    aiResearchRatingHelp: string;
    evidenceSummaryPending: string;
    paperCitations: string;
    confidenceScore: string;
    servingSize: string;
    notSpecified: string;
    ingredients: string;
    openIngredientProfile: string;
    preparationMethodRatings: string;
    nutritionalInformation: string;
    noNutritionInfo: string;
    nutritionFacts: string;
    amountPerServing: string;
    calories: string;
    caloriesFromFat: string;
    dailyValue: string;
    totalFat: string;
    saturatedFat: string;
    totalCarbohydrates: string;
    dietaryFiber: string;
    sugars: string;
    protein: string;
    salt: string;
    nutritionFootnote: string;
  };
  auth: {
    email: string;
    password: string;
    username: string;
    signIn: string;
    signOut: string;
    createAccount: string;
    forgotPassword: string;
  };
  authPages: {
    loginTitle: string;
    loginSubtitle: string;
    registerSubtitle: string;
    continue: string;
    continueWithGoogle: string;
    continueWithApple: string;
    createAccountWithGoogle: string;
    createAccountWithApple: string;
    providerInfo: string;
    supporterAccess: string;
    kofiLinkedTitle: string;
    kofiLinkedDescription: string;
    accountLinkingModel: string;
    googleIdentity: string;
    appleIdentity: string;
    kofiSupporter: string;
    oneNutriiUsername: string;
  };
  errors: {
    forbiddenTitle: string;
    forbiddenSubtitle: string;
    forbiddenHeading: string;
    forbiddenBody: string;
    notFoundTitle: string;
    notFoundSubtitle: string;
    notFoundHeading: string;
    notFoundBody: string;
    goHome: string;
    goHomePage: string;
    browseFoods: string;
    contactSupport: string;
    accountDeletedTitle: string;
    accountDeletedSubtitle: string;
    accountDeletedHeading: string;
    accountDeletedBody: string;
    nextStepPrompt: string;
    returnHome: string;
    createNewAccount: string;
  };
  states: {
    saving: string;
    saved: string;
    sending: string;
    sent: string;
    failedToLoad: string;
    checkConnection: string;
  };
};

export type LocaleOverride = Partial<
  Omit<LocaleMessages, "common" | "nav" | "foodExplorer" | "ingredientExplorer" | "sort" | "hazard" | "dietary" | "detail" | "foodDetail" | "auth" | "authPages" | "errors" | "states">
> & {
  common?: Partial<LocaleMessages["common"]>;
  nav?: Partial<LocaleMessages["nav"]>;
  foodExplorer?: Partial<LocaleMessages["foodExplorer"]>;
  ingredientExplorer?: Partial<LocaleMessages["ingredientExplorer"]>;
  sort?: Partial<LocaleMessages["sort"]>;
  hazard?: Partial<LocaleMessages["hazard"]> & {
    levels?: Partial<LocaleMessages["hazard"]["levels"]>;
  };
  dietary?: Partial<LocaleMessages["dietary"]>;
  detail?: Partial<LocaleMessages["detail"]>;
  foodDetail?: Partial<LocaleMessages["foodDetail"]>;
  auth?: Partial<LocaleMessages["auth"]>;
  authPages?: Partial<LocaleMessages["authPages"]>;
  errors?: Partial<LocaleMessages["errors"]>;
  states?: Partial<LocaleMessages["states"]>;
};
