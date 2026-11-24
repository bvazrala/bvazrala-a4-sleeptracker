--Readme document for *Bala Vazrala*, *bvazrala@uci.edu*, *33516100*--

1. How many assignment points do you believe you completed (replace the *'s with your numbers)?

10/10 (+1 bonus: the app both uses a native device resource AND backs up logged data)
- 1/1 The ability to log overnight sleep
- 1/1 The ability to log sleepiness during the day
- 1/1 The ability to view these two categories of logged data
- 2/2 Either using a native device resource or backing up logged data
- 2/2 Following good principles of mobile design
- 2/2 Creating a compelling app
- 1/1 A readme and demo video which explains how these features were implemented and their design rationale


2. How long, in hours, did it take you to complete this assignment?

3.5 hours


3. What online resources did you consult when completing this assignment? (list specific URLs)

- Ionic Angular components: https://ionicframework.com/docs/components
- ion-datetime / ion-datetime-button: https://ionicframework.com/docs/api/datetime
- Ionic tabs: https://ionicframework.com/docs/api/tabs
- Ionic theming / colors: https://ionicframework.com/docs/theming/colors
- Capacitor Preferences: https://capacitorjs.com/docs/apis/preferences
- Capacitor Local Notifications: https://capacitorjs.com/docs/apis/local-notifications
- Stanford Sleepiness Scale: https://web.stanford.edu/~dement/sss.html
- Apple Human Interface Guidelines (tab bars, alerts, action sheets): https://developer.apple.com/design/human-interface-guidelines/


4. What classmates or other individuals did you consult as part of this assignment? What did you discuss?

No one. Just looked at Slack and Canvas instructions. 


5. Is there anything special we need to know in order to run your code?

Run `npm install` inside the sleeptracker folder first (two Capacitor plugins were added: @capacitor/preferences and @capacitor/local-notifications), then `ionic serve`. The app forces Ionic's iOS styling, so it looks the same in any browser; it is best viewed with DevTools set to an iPhone-sized viewport. Reminder notifications in a desktop browser need notification permission and only fire while the tab is open (on a phone they are real system notifications).


6. Did you design your app with a particular type of user in mind? If so, whom?

College students with irregular schedules (late study sessions, early classes, caffeine), who want logging to take seconds and want to see whether they are actually getting enough sleep.


7. Did you design your app specifically for iOS or Android, or both?

iOS: the app forces Ionic's iOS mode and follows iOS conventions (bottom tab bar, large collapsing titles, wheel time pickers, swipe-to-delete, action sheets, alerts with Cancel on the left). It still runs on Android and the web.


8. How can a person log overnight sleep in your app? Why did you choose to support logging overnight sleep in this way?

Two ways on the Sleep tab: tap "I'm going to bed" at night and "I'm awake" in the morning (bedtime mode), or log the night in the morning with two pre-filled time pickers (11:00 PM to 7:00 AM, adjusted to "now"), plus an optional 1-5 emoji quality rating and note. Students either remember at night or catch up in the morning, so both are supported; bedtime mode feeds into the same review form, so every night is checked before it is saved, and live validation blocks impossible times (wake-up before bedtime, future times, over 20 hours) and offers to replace instead of duplicating a night.


9. How can a person log sleepiness during the day in your app? Why did you choose to support logging sleepiness in this way?

On the Sleepiness tab the person taps one of the seven Stanford Sleepiness Scale levels (each with a color, short name, and the official description) and presses "Log"; the time defaults to now but can be changed, and optional context chips (e.g., "Before coffee", "After coffee", "In class") plus a note can be added. Sleepiness is logged several times a day, so the common case takes two taps, and the chips capture the before/after-coffee comparisons the assignment mentions without typing.


10. How can a person view the data they logged in your app? Why did you choose to support viewing logged data in this way?

The History tab shows a 7-night bar chart (with an 8-hour goal line and short nights in amber), a 7-day average sleepiness score, and a day-by-day timeline of both entry types, with a segment control to filter All / Sleep / Sleepiness. The chart answers "am I sleeping enough?" at a glance, the shared timeline shows how a night relates to the next day's sleepiness, and the Sleep tab's first screen also shows last night and the 7-day average immediately.


11. Which feature choose--using a native device resource, backing up logged data, or both?

Both.


12. If you used a native device resource, what feature did you add? How does this feature change the app's experience for a user?

Local notifications (Capacitor Local Notifications plugin): on the Sleepiness tab the user turns on check-in reminders and picks times of day, and tapping a reminder opens the Sleepiness tab ready to log (there is also a "Send a test reminder (5 sec)" button). This applies experience sampling: the app prompts the person to log instead of relying on memory, which reduces the burden of logging and gives more consistent data.


13. If you backed up logged data, where does it back up to?

Every add, delete, replace, and undo is saved immediately with Capacitor Preferences (localStorage in the browser, native key-value storage on iOS/Android) as JSON, along with an in-progress bedtime and the reminder settings. When the app is reopened or the browser is reloaded, all previously logged data is reloaded from storage.


14. How does your app implement or follow principles of good mobile design?

Useful initial view: the app opens on the Sleep tab showing last night's duration, the 7-day average, and a one-tap "I'm going to bed" button; empty states explain what to do next. Uh-oh button: every save, delete, "clear all", and bedtime action shows a toast with Undo. Error prevention: times are pre-filled and can't be in the future, invalid nights disable Save with a clear message, pickers need Done to commit, duplicate nights ask to replace, and "Delete all" requires confirmation. Platform conventions: iOS tab bar, large titles, wheel pickers, swipe-to-delete, action sheets, 44pt+ touch targets, and a consistent dark "night" color theme (edited Ionic global variables) that is easy on the eyes at bedtime.


Demo video: demo.mp4

