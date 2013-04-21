
NOTIFY=0
ifeq ($(NOTIFY),1)
NOTIFY_CMD=terminal-notifier -message "Compiled into build.js" -title "Build done"
else
NOTIFY_CMD=echo "Build done"
endif
BUILD_CMD=browserify -d js/game.js > build.js

all:
	noprob -x '$(BUILD_CMD) && $(NOTIFY_CMD)' -e js -w js
	
