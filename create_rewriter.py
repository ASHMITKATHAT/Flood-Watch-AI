import os

script = """#!/usr/bin/env bash
OLD_EMAIL="amgauravv@gmail.com"
CORRECT_NAME="ASHMITKATHAT"
CORRECT_EMAIL="ashmitkathat0@gmail.com"
if [ "$GIT_COMMITTER_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_COMMITTER_NAME="$CORRECT_NAME"
    export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_AUTHOR_NAME="$CORRECT_NAME"
    export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
fi
"""

with open('rewrite_env.sh', 'w', newline='\n') as f:
    f.write(script)
