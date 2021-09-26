when repo is downloaded to deploy:
1. put all secret files in you local sources.

2. in root directory run:
    firebase init functions
(for all questions about override file reply with no).

3. in functions directory run:
    npm install

4. in root directory run:
    firebase deploy